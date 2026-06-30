"""Entry point so the package can be run with:  python -m survey_cogo"""
import sys
from .cli import main, run_demo

if len(sys.argv) > 1 and sys.argv[1] == "--demo":
    run_demo()
else:
    main()
