import sys

p = sys.argv[1]
with open(p, "rb") as f:
    for i, line in enumerate(f.read().splitlines(), 1):
        print(f"{i:03d}: {line!r}")
