import sys

try:
    import customtkinter as ctk
except ImportError:
    print("customtkinter not found. Activate the venv and run: pip install customtkinter")
    sys.exit(1)

from app.ui.main_window import MainWindow


def main():
    ctk.set_appearance_mode("dark")
    ctk.set_default_color_theme("blue")
    window = MainWindow()
    window.mainloop()


if __name__ == "__main__":
    main()
