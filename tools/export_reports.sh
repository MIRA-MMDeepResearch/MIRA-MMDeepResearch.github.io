#!/bin/bash
# Re-export the four report examples (Appendix D of the paper) as page images for the
# project page. Each report is typeset on its own, with the paper's own document class,
# preamble and showcase macros, so every report starts on a fresh page.
#
#   bash tools/export_reports.sh [path/to/paper]
#
# Needs: tectonic, pdfcrop (TeX Live, uses ghostscript), pdftocairo (poppler), cwebp. Reads the paper source; never writes to it.
set -euo pipefail
cd "$(dirname "$0")/.."
PAPER="${1:-$HOME/Papers/MIRA/Joy Kit/paper}"
OUT=assets/reports
DPI=240   # a full-width cropped page comes out about 1600 px wide
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

cp -R "$PAPER/." "$WORK/paper"
cd "$WORK/paper"

python3 - <<'EOF'
import re, pathlib
main = pathlib.Path("main.tex").read_text()
preamble = main.split(r"\begin{document}")[0]
sources = {
    "concrete": pathlib.Path("sections/appendix/D_examples.tex").read_text(),
    "cam": pathlib.Path("sections/showcase/cam.tex").read_text(),
}
for topic, text in sources.items():
    for m in re.finditer(r"\\begin\{reportcard\}\{(\w+)\}.*?\\end\{reportcard\}", text, re.S):
        mode = m.group(1).lower()
        doc = (preamble + "\\begin{document}\n\\pagestyle{empty}\n"
               "\\input{sections/showcase/style}\n" + m.group(0) + "\n\\end{document}\n")
        pathlib.Path(f"report_{topic}_{mode}.tex").write_text(doc)
        print("wrote", f"report_{topic}_{mode}.tex")
EOF

cd - >/dev/null
rm -rf "$OUT" && mkdir -p "$OUT"
for tex in "$WORK"/paper/report_*.tex; do
  name="$(basename "$tex" .tex)"; name="${name#report_}"
  (cd "$WORK/paper" && tectonic --outdir "$WORK" "$(basename "$tex")" >/dev/null 2>&1) \
    || { echo "tectonic failed for $name" >&2; exit 1; }
  # Trim each page to its content (drops the page margins and the empty end of a last page).
  pdfcrop --margins 18 "$WORK/report_${name}.pdf" "$WORK/crop_${name}.pdf" >/dev/null
  pdf="$WORK/crop_${name}.pdf"
  pages="$(pdfinfo "$pdf" | awk '/^Pages:/{print $2}')"
  mkdir -p "$OUT/$name"
  for p in $(seq 1 "$pages"); do
    pdftocairo -png -r "$DPI" -f "$p" -l "$p" -singlefile "$pdf" "$WORK/page"
    cwebp -quiet -q 82 "$WORK/page.png" -o "$OUT/$name/$(printf '%02d' "$p").webp"
  done
  echo "$name: $pages pages"
done

# Page list for the carousel. A .js file (not JSON) so it also loads from file://.
python3 - "$OUT" <<'PY'
import json, pathlib, subprocess, sys
out = pathlib.Path(sys.argv[1])
def size(f):
    r = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(f)], capture_output=True, text=True).stdout
    vals = [int(l.split()[-1]) for l in r.splitlines() if "pixel" in l]
    return vals[0], vals[1]
data = {}
for d in sorted(p for p in out.iterdir() if p.is_dir()):
    data[d.name] = [{"src": f"{out}/{d.name}/{f.name}", "w": size(f)[0], "h": size(f)[1]}
                    for f in sorted(d.glob("*.webp"))]
(out / "manifest.js").write_text("window.MIRA_REPORTS = " + json.dumps(data, indent=1) + ";\n")
print("manifest:", {k: len(v) for k, v in data.items()})
PY
du -sh "$OUT"
