@echo off
REM Generiert Feature Importances für alle Saisons

echo ========================================
echo Feature Importances für alle Saisons generieren
echo ========================================
echo.

call .venv\Scripts\activate.bat

echo Generiere Feature Importances für 2020-21...
python code\analysis\compute_feature_importance.py --season 2020-21

echo Generiere Feature Importances für 2021-22...
python code\analysis\compute_feature_importance.py --season 2021-22

echo Generiere Feature Importances für 2022-23...
python code\analysis\compute_feature_importance.py --season 2022-23

echo Generiere Feature Importances für 2023-24...
python code\analysis\compute_feature_importance.py --season 2023-24

echo.
echo ========================================
echo Fertig! Feature Importances wurden generiert.
echo ========================================

pause
