from semantic_validate import positive_errors
import sys
errors=positive_errors()
print(f'positive_errors={len(errors)}')
[print(e,file=sys.stderr) for e in errors]
raise SystemExit(bool(errors))
