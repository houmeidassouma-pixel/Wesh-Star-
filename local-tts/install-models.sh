#!/usr/bin/env bash
set -euo pipefail
BASE="https://huggingface.co/rhasspy/piper-voices/resolve/main"
mkdir -p models
fetch(){
  local path="$1" file="$2"
  echo "Installing local voice: $file"
  curl -L --fail --retry 3 -o "models/$file" "$BASE/$path/$file"
  curl -L --fail --retry 3 -o "models/$file.json" "$BASE/$path/$file.json"
}
PACK="${1:-core}"
case "$PACK" in
  core)
    MODELS=(
      "fr/fr_FR/siwis/medium|fr_FR-siwis-medium.onnx"
      "fr/fr_FR/tom/medium|fr_FR-tom-medium.onnx"
      "fr/fr_FR/upmc/medium|fr_FR-upmc-medium.onnx"
      "de/de_DE/thorsten/medium|de_DE-thorsten-medium.onnx"
      "de/de_DE/thorsten/high|de_DE-thorsten-high.onnx"
      "de/de_DE/thorsten_emotional/medium|de_DE-thorsten_emotional-medium.onnx"
      "en/en_US/lessac/medium|en_US-lessac-medium.onnx"
      "en/en_US/ryan/medium|en_US-ryan-medium.onnx"
      "en/en_US/lessac/high|en_US-lessac-high.onnx"
      "en/en_GB/alba/medium|en_GB-alba-medium.onnx"
      "en/en_GB/alan/medium|en_GB-alan-medium.onnx"
      "en/en_GB/cori/high|en_GB-cori-high.onnx"
    ) ;;
  popular)
    MODELS=(
      "fr/fr_FR/siwis/medium|fr_FR-siwis-medium.onnx" "fr/fr_FR/tom/medium|fr_FR-tom-medium.onnx" "fr/fr_FR/mls/medium|fr_FR-mls-medium.onnx" "fr/fr_FR/upmc/medium|fr_FR-upmc-medium.onnx"
      "de/de_DE/thorsten/medium|de_DE-thorsten-medium.onnx" "de/de_DE/thorsten/high|de_DE-thorsten-high.onnx" "de/de_DE/eva_k/x_low|de_DE-eva_k-x_low.onnx" "de/de_DE/thorsten_emotional/medium|de_DE-thorsten_emotional-medium.onnx"
      "en/en_US/lessac/medium|en_US-lessac-medium.onnx" "en/en_US/lessac/high|en_US-lessac-high.onnx" "en/en_US/ryan/medium|en_US-ryan-medium.onnx" "en/en_US/bryce/medium|en_US-bryce-medium.onnx" "en/en_US/amy/medium|en_US-amy-medium.onnx" "en/en_US/john/medium|en_US-john-medium.onnx" "en/en_US/kristin/medium|en_US-kristin-medium.onnx"
      "en/en_GB/alan/medium|en_GB-alan-medium.onnx" "en/en_GB/alba/medium|en_GB-alba-medium.onnx" "en/en_GB/cori/medium|en_GB-cori-medium.onnx" "en/en_GB/cori/high|en_GB-cori-high.onnx" "en/en_GB/jenny_dioco/medium|en_GB-jenny_dioco-medium.onnx"
      "es/es_ES/davefx/medium|es_ES-davefx-medium.onnx" "es/es_ES/sharvard/medium|es_ES-sharvard-medium.onnx" "es/es_MX/claude/high|es_MX-claude-high.onnx" "es/es_AR/daniela/high|es_AR-daniela-high.onnx"
      "it/it_IT/paola/medium|it_IT-paola-medium.onnx" "it/it_IT/riccardo/x_low|it_IT-riccardo-x_low.onnx"
      "pt/pt_BR/faber/medium|pt_BR-faber-medium.onnx" "pt/pt_BR/cadu/medium|pt_BR-cadu-medium.onnx" "pt/pt_PT/tugao/medium|pt_PT-tugao-medium.onnx"
      "nl/nl_NL/mls/medium|nl_NL-mls-medium.onnx" "nl/nl_NL/pim/medium|nl_NL-pim-medium.onnx" "nl/nl_NL/ronnie/medium|nl_NL-ronnie-medium.onnx"
      "pl/pl_PL/gosia/medium|pl_PL-gosia-medium.onnx" "pl/pl_PL/darkman/medium|pl_PL-darkman-medium.onnx"
      "ru/ru_RU/denis/medium|ru_RU-denis-medium.onnx" "ru/ru_RU/irina/medium|ru_RU-irina-medium.onnx"
      "ar/ar_JO/kareem/medium|ar_JO-kareem-medium.onnx" "hi/hi_IN/pratham/medium|hi_IN-pratham-medium.onnx" "hi/hi_IN/priyamvada/medium|hi_IN-priyamvada-medium.onnx"
      "tr/tr_TR/dfki/medium|tr_TR-dfki-medium.onnx" "zh/zh_CN/huayan/medium|zh_CN-huayan-medium.onnx" "sw/sw_CD/lanfrica/medium|sw_CD-lanfrica-medium.onnx" "vi/vi_VN/vais1000/medium|vi_VN-vais1000-medium.onnx"
    ) ;;
  all)
    mapfile -t MODELS < <(python - <<'PY2'
import json
seen=set()
for _,v in json.load(open('voice-models.json')).items():
    key=(v['sourcePath'],v['model'])
    if key not in seen:
        seen.add(key)
        print(v['sourcePath']+'|'+v['model'])
PY2
    ) ;;
  *) echo "Usage: $0 [core|popular|all]"; exit 2;;
esac
for item in "${MODELS[@]}"; do
  IFS='|' read -r path file <<< "$item"
  fetch "$path" "$file"
done
echo "Done. Selected Wesh Star IA voices are installed locally."
