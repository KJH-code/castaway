"""Exit codes and the single exception type used across relay."""

OK = 0
ERR = 1        # generic error or usage error
PARSE = 2      # response parse error
SAFETY = 3     # safety violation (no files changed)
TESTFAIL = 4   # hook or test failure (changes remain applied)
GIT = 5        # git error
SIZE = 6       # size/budget error


class RelayError(Exception):
    def __init__(self, message: str, code: int = ERR):
        super().__init__(message)
        self.code = code
