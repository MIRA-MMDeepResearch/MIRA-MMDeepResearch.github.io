# MIRA-MMDeepResearch.github.io

Source of https://mira-mmdeepresearch.github.io/, the project page for
*MIRA: A Multimodal Illustrated Deep Research Agent for Controllable Reports* (arXiv 2610.25926).

- `index.html` is generated. Do not edit it by hand.
- `src/`: `head.html` (styles), `body.html` (markup), `app.js` (interaction). Edit these.
- `data/`: `table.json` (main results), `traces.json` (tool-call traces, run statistics and the request of the
  three case studies), `reports/*.tex` (the paper's annotated report appendix, copied verbatim).
- `assets/img/`: figures and logo. `assets/reports/<case>/`: the images the reports cite.
- `tools/build.py` assembles `index.html` from the above:

      python3 tools/build.py

  `tex2html.py` converts the report LaTeX for the reader; `traj2json.py` compacts raw harness trajectories
  and is only needed to regenerate `traces.json`.

Paper: https://arxiv.org/abs/2610.25926 ·
Code: https://github.com/MIRA-MMDeepResearch/MIRA ·
Model: https://huggingface.co/MIRA-MMDeepResearch/MIRA-SFT-35B-A3B ·
Data: https://huggingface.co/datasets/MIRA-MMDeepResearch/MIRA-Harness-Data-4K and
https://huggingface.co/datasets/MIRA-MMDeepResearch/MIRA-General-Data-20K
