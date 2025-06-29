@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "LOG_FILE=install.log"
set "TEMP_LOG=temp.log"

REM Очистка предыдущего лога
if exist "%LOG_FILE%" del "%LOG_FILE%"
if exist "%TEMP_LOG%" del "%TEMP_LOG%"

echo.
echo === Проверка и установка зависимостей ===

REM Проверка наличия Python
where python >nul 2>&1
if errorlevel 1 (
    echo [%DATE% %TIME%] ERROR: Python not found >> "%LOG_FILE%"
    echo ОШИБКА: Python не установлен или не добавлен в PATH
    echo         Скачайте установщик с https://python.org
    echo         Обязательно отметьте "Add Python to PATH"
    pause
    exit /b 1
)

REM Проверка наличия pip
python -m pip --version >nul 2>&1
if errorlevel 1 (
    echo [%DATE% %TIME%] WARNING: pip not available, attempting recovery >> "%LOG_FILE%"
    echo Восстановление pip...
    python -m ensurepip --default-pip >nul 2>&1
)

REM Обновление pip
echo Обновление pip...
echo [%DATE% %TIME%] UPDATING PIP >> "%LOG_FILE%"
python -m pip install --no-warn-script-location --upgrade pip >"%TEMP_LOG%" 2>&1
if errorlevel 1 (
    type "%TEMP_LOG%" >> "%LOG_FILE%"
    echo Предупреждение: не удалось обновить pip
) else (
    type "%TEMP_LOG%" >> "%LOG_FILE%"
)
del "%TEMP_LOG%" 2>nul

REM Установка зависимостей
if exist "requirements.txt" (
    echo Установка зависимостей...
    echo [%DATE% %TIME%] INSTALLING DEPENDENCIES >> "%LOG_FILE%"
    pip install --no-warn-script-location -r requirements.txt >"%TEMP_LOG%" 2>&1
    
    if errorlevel 1 (
        type "%TEMP_LOG%" >> "%LOG_FILE%"
        echo ОШИБКА: Не удалось установить зависимости
        echo         Подробности в %LOG_FILE%
        pause
        exit /b 1
    ) else (
        type "%TEMP_LOG%" >> "%LOG_FILE%"
        echo Зависимости успешно установлены
    )
    del "%TEMP_LOG%" 2>nul
) else (
    echo [%DATE% %TIME%] WARNING: requirements.txt not found >> "%LOG_FILE%"
    echo Предупреждение: requirements.txt не найден
)

echo.
echo === Запуск приложения ===
echo [%DATE% %TIME%] STARTING APPLICATION >> "%LOG_FILE%"
python -X utf8 app.py

if errorlevel 1 (
    echo ОШИБКА: Приложение завершилось с кодом %errorlevel%
    echo         Проверьте лог: %LOG_FILE%
    pause
)
exit /b 0