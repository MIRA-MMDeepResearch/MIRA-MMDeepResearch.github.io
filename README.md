<div align="center">

  <img src="assets/img/logo_512.png" alt="MIRA" width="22%">
  <h1>MIRA: A Multimodal Illustrated Deep Research Agent for Controllable Reports</h1>

  <p><b>Multimodal Deep Research &nbsp;·&nbsp; Controllable Illustrated Reports &nbsp;·&nbsp; MIRA-Harness</b></p>

  [![Paper](https://img.shields.io/badge/Paper-DA291C?style=for-the-badge&logo=arxiv&logoColor=white)](https://arxiv.org/abs/2610.25926)
  [![HF Papers](https://img.shields.io/badge/HF_Papers-8F1D14?style=for-the-badge&logo=huggingface&logoColor=white)](https://huggingface.co/papers/2610.25926)
  [![Project Page](https://img.shields.io/badge/Project_Page-000000?style=for-the-badge&logo=googlechrome&logoColor=white)](https://mira-mmdeepresearch.github.io/)
  [![Code](https://img.shields.io/badge/Code-000000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/MIRA-MMDeepResearch/MIRA)
  [![Model](https://img.shields.io/badge/MIRA--SFT--35B--A3B-DA291C?style=for-the-badge&logo=huggingface&logoColor=white)](https://huggingface.co/MIRA-MMDeepResearch/MIRA-SFT-35B-A3B)
  [![Data](https://img.shields.io/badge/MIRA_Data-DA291C?style=for-the-badge&logo=huggingface&logoColor=white)](https://huggingface.co/MIRA-MMDeepResearch)

  [![Model License](https://img.shields.io/badge/Model_License-Apache_2.0-DA291C.svg)](https://huggingface.co/MIRA-MMDeepResearch/MIRA-SFT-35B-A3B)
  [![Data License](https://img.shields.io/badge/Data_License-CC_BY--NC_4.0-8F1D14.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
  [![arXiv](https://img.shields.io/badge/arXiv-2610.25926-B31B1B.svg)](https://arxiv.org/abs/2610.25926)

</div>

---

This repository is the source of the project page, https://mira-mmdeepresearch.github.io/.

## 🧭 Layout

- `index.html` is generated. Do not edit it by hand.
- `src/`: `head.html` (styles), `body.html` (markup), `app.js` (interaction). Edit these.
- `data/`: `table.json` (main results), `traces.json` (tool-call traces, run statistics and the request of the three case studies), `reports/*.tex` (the paper's annotated report appendix, copied verbatim).
- `assets/img/`: figures, logo and the mascot's mask layers. `assets/reports/<case>/`: the images the reports cite.
- `tools/`: `build.py` assembles `index.html`; `tex2html.py` converts the report LaTeX for the reader; `traj2json.py` compacts raw harness trajectories and is only needed to regenerate `traces.json`.

## 🛠️ Build

```bash
python3 tools/build.py
```

## 📄 Citation

```bibtex
@article{mira2026,
  title   = {MIRA: A Multimodal Illustrated Deep Research Agent for Controllable Reports},
  author  = {Wu, Hongrui and Tuo, Kaiwen and Wang, Congcong and Li, Gen and Dong, Shuai and Yu, Xinlei and Xu, Yuqi and Hou, Haowen and Peng, Zelin and Wang, Jiaqi},
  journal = {arXiv preprint arXiv:2610.25926},
  year    = {2026}
}
```
