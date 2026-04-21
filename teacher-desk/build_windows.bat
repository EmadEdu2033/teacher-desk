@echo off
echo ============================================
echo  Teacher Desk - Windows Build Script
echo ============================================

echo.
echo [1/4] Checking Python...
python --version
if errorlevel 1 (
    echo ERROR: Python not found. Install Python 3.11+ and add to PATH.
    pause
    exit /b 1
)

echo.
echo [2/4] Installing PyInstaller...
pip install pyinstaller>=6.0.0

echo.
echo [3/4] Building executable...
pyinstaller teacher_desk.spec --clean --noconfirm

echo.
echo [4/4] Creating portable package...
if exist "dist\TeacherDesk.exe" (
    if not exist "release" mkdir release
    copy "dist\TeacherDesk.exe" "release\TeacherDesk.exe"
    echo.
    echo ============================================
    echo  BUILD SUCCESSFUL!
    echo  Output: release\TeacherDesk.exe
    echo  
    echo  To distribute: copy release\TeacherDesk.exe
    echo  Data is stored beside the .exe in
    echo  TeacherDeskData\ folder on first run.
    echo ============================================
) else (
    echo.
    echo ERROR: Build failed. Check output above.
)

pause
