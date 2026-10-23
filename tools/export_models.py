#!/usr/bin/env python3
"""READ-ONLY exporter from private FOUR / AI .pt files to public ONNX models.

No training is performed. The original training directory, checkpoints and .venv
are not written to or modified by this tool.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = HERE.parent / 'four-ai'

def digest(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for part in iter(lambda:f.read(1024*1024),b''): h.update(part)
    return h.hexdigest()

def pick(source, name):
    history = sorted((source/'data'/'models'/'history').glob('best-*.pt'),
       key=lambda p:int(re.search(r'best-(\d+)\.pt$',p.name).group(1))
            if re.search(r'best-(\d+)\.pt$',p.name) else -1)
    played = [p for p in history if int(re.search(r'best-(\d+)\.pt$',p.name).group(1)) > 0]
    if len(played)<2:
        raise RuntimeError('Fewer than two noninitial historical best-*.pt models found. '
                           'Supply --easy and --medium paths for existing historical snapshots; '
                           'the exporter will not invent missing trained versions.')
    return {'easy':played[0], 'medium':played[len(played)//2], 'hard':source/'data'/'models'/'best.pt'}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,default=DEFAULT_SOURCE,help='Private four-ai folder')
    for name in ('easy','medium','hard'):
        parser.add_argument('--'+name,type=Path,help=f'Explicit existing .pt file to export as {name}')
    parser.add_argument('--list',action='store_true',help='List available trained historical models and exit')
    a=parser.parse_args()
    source=a.source.resolve()
    if not (source/'fourai'/'ai'/'network.py').exists():
        parser.error(f'Original FOUR / AI installation not found at {source}. Specify --source PATH')
    history = sorted((source/'data'/'models'/'history').glob('*.pt'))
    if a.list:
        print('Private training data (read only):')
        for path in history:print(' ',path.name)
        for name in ('best.pt','latest.pt'):
            path=source/'data'/'models'/name
            if path.exists():print(' ',name)
        return
    try:
        import torch
        import onnx
    except ImportError as e:
        parser.error(f'Missing small export dependency {e.name}. '
                     'Use your EXISTING four-ai .venv and run: python -m pip install onnx. '
                     'Do not reinstall torch or CUDA.')
    sys.path.insert(0,str(source))
    from fourai.ai.network import PolicyValueNet
    choices=pick(source,'default') if not (a.easy and a.medium and a.hard) else {}
    for name in ('easy','medium','hard'):
        override=getattr(a,name)
        if override:choices[name]=override.resolve()
        if name not in choices:parser.error(f'No model selected for {name}')
    for name,path in choices.items():
        if not path.is_file(): parser.error(f'{name} model not found: {path}')
    if len({digest(path) for path in choices.values()})<3:
        parser.error('Selected models are not three distinct saved weight files. Choose different historical versions.')
    dst=HERE/'public'/'models';dst.mkdir(parents=True,exist_ok=True)
    manifest={'version':1,'ready':False,'models':{}}
    for name,path in choices.items():
        state=torch.load(path,map_location='cpu',weights_only=True)
        if not isinstance(state,dict):raise RuntimeError(f'Invalid model state in {path.name}')
        net=PolicyValueNet(channels=64,blocks=4).cpu().eval()
        net.load_state_dict(state,strict=True)
        x=torch.zeros((2,2,6,7),dtype=torch.float32)
        output=dst/(name+'.onnx')
        staging=dst/(name+'.staging.onnx')
        with torch.inference_mode():
            p,v=net(x)
            if p.shape!=(2,7) or v.shape!=(2,):raise RuntimeError('Unexpected policy/value shapes')
        # Legacy ONNX path is reliable for the convolution + GroupNorm architecture.
        torch.onnx.export(net,x,str(staging),opset_version=17,dynamo=False,
           input_names=['boards'],output_names=['policy_logits','value'],
           dynamic_axes={'boards':{0:'batch'},'policy_logits':{0:'batch'},'value':{0:'batch'}})
        onnx.checker.check_model(str(staging))
        staging.replace(output)
        match=re.search(r'best-(\d+)\.pt$',path.name)
        manifest['models'][name]={'file':output.name,'sha256':digest(output),
            'source_file':path.name,'source_sha256':digest(path),
            'training_games':int(match.group(1)) if match else None}
        print(f'Exported {name}: {path.name} -> {output.name} ({output.stat().st_size//1024} KB)')
    manifest['ready']=True
    manifest_path=dst/'manifest.json'
    temp=dst/'manifest.staging.json'
    temp.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    temp.replace(manifest_path)
    print('\nSUCCESS: Read-only model export completed. Your original data, .venv and source were not changed.')

if __name__=='__main__':
    try:main()
    except Exception as e:
        print(f'EXPORT FAILED: {e}',file=sys.stderr)
        sys.exit(1)
