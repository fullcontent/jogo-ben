@echo off
title Sala de Jogos
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py servidor.py
  goto :fim
)
where python >nul 2>nul
if %errorlevel%==0 (
  python servidor.py
  goto :fim
)
echo Nao encontrei o Python neste computador.
echo Instale em https://www.python.org/downloads/ e tente de novo.
:fim
pause
