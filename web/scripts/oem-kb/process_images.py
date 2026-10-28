import shutil
import sys
from pathlib import Path
from oem_kb_pipeline import main
from oem_kb_pipeline import DEFAULT_SOURCE, parse_document

if __name__ == "__main__":
    source = DEFAULT_SOURCE
    data = parse_document(source)
    destination = Path(__file__).resolve().parents[2] / "public" / "oem-knowledge-base" / "images"
    destination.mkdir(parents=True, exist_ok=True)
    for image in data["images"]:
        source_image = source.parent / image["path"]
        if source_image.exists():
            shutil.copy2(source_image, destination / Path(image["path"]).name)
    sys.argv.insert(1, "parse")
    raise SystemExit(main())
