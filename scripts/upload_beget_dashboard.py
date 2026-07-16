from __future__ import annotations

import os
from ftplib import FTP, FTP_TLS
from pathlib import Path


class ReusedSessionFTP_TLS(FTP_TLS):
    def ntransfercmd(self, cmd, rest=None):
        conn, size = FTP.ntransfercmd(self, cmd, rest)
        if self._prot_p:
            conn = self.context.wrap_socket(
                conn,
                server_hostname=self.host,
                session=self.sock.session,
            )
        return conn, size


ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "outputs" / "tenant-mix-online-dashboard.html"


def main() -> None:
    user = os.environ["BEGET_USER"]
    password = os.environ["BEGET_PASS"]
    host = os.environ.get("BEGET_HOST", "f93070of.beget.tech")
    remote_dir = os.environ.get(
        "BEGET_REMOTE_DIR", "/f93070of.beget.tech/public_html"
    )

    ftp = ReusedSessionFTP_TLS(host, timeout=60)
    ftp.login(user, password)
    ftp.prot_p()
    ftp.cwd(remote_dir)
    with HTML_PATH.open("rb") as source:
        ftp.storbinary("STOR index.html", source)
    ftp.quit()
    print(f"uploaded {HTML_PATH.stat().st_size} bytes")


if __name__ == "__main__":
    main()
