import sys
from oem_kb_pipeline import main

if __name__ == "__main__":
    sys.argv.insert(1, "index")
    raise SystemExit(main())
