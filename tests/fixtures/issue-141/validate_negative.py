from semantic_validate import negative_errors
import sys
errors,count=negative_errors()
print(f'negative_fixtures={count} expected_failures={count-len(errors)} unexpected_passes={len(errors)}')
[print(e,file=sys.stderr) for e in errors]
raise SystemExit(bool(errors))
