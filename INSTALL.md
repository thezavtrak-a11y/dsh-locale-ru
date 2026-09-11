# dsh-locale-ru — установка и обслуживание

## Состояние

Пакет собран, подключён к профилю `web` и подтверждён в живом GUI: в
**Settings → General → Language** появился третий язык — **Русский**.

```
%USERPROFILE%\.dsh\profiles\web\package.json
  dependencies:  "dsh-locale-ru": "file:<путь к этому репозиторию>"
  dsh.profile.bundles: [ @deepseek-ai/dsh-base, @deepseek-ai/dsh-web-app,
                         @tt-a1i/archify-dsh, dsh-locale-ru ]
```

Штатная команда, которой это делается (`<путь>` — каталог, куда склонирован
репозиторий):

```powershell
dsh plugin --profile web add "file:<путь>"
```

`dsh plugin` — обёртка над pnpm в каталоге профиля: `pnpm add` плюс запись строки
в `dsh.profile.bundles`. Состав дерева проверяется командой
`dsh --profile web --dump-config` — в выводе должен быть блок
`# == dsh-locale-ru` со строкой `- id: locale-ru`.

## Правка переводов

1. Меняем значение в `dict/ru/<namespace>.json` (источник правды; ключи не трогать).
2. `node scripts/build.mjs` — пересобирает `lib/client.js`.
3. `node scripts/check.mjs` — сверка с английским корпусом (`work/en/`):
   покрытие, пропущенные ключи, плейсхолдеры. `--strict` — режим ворот для CI.
4. `node tools/smoke.mjs .` — прогон бандла через мок-загрузчик и мок `ctx.locale`.
5. `node tools/scanner-repro.mjs` — проверка, что строка профиля резолвится
   ровно так, как её видит сканер клиентских плагинов.
6. Обновить страницу в браузере: клиентский HMR сам переимпортирует
   изменившийся бандл. Перезапуск сервера нужен только при смене состава плагинов.

Инструменты `tools/scanner-repro.mjs` и `tools/verify-live.mjs` сами находят
установку dsh и каталог профиля; переопределить можно переменными окружения
`DSH_INSTALL`, `DSH_PROFILE_DIR`, `DSH_HOME`, `DSH_PACKAGE_DIR`.

## Перезапуск GUI

```powershell
# 1. найти процессы
Get-NetTCPConnection -LocalPort 3080 -State Listen | Select-Object OwningProcess
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'dsh web' } |
  Select-Object ProcessId, ParentProcessId, CommandLine

# 2. остановить сервер и обёртку npx над ним
taskkill /PID <pid-сервера> /T /F
taskkill /PID <pid-обёртки> /T /F

# 3. поднять заново
& "$env:USERPROFILE\.dsh\launch-web.cmd"
```

Лаунчер harness выставляет `TEMP` вне домашнего каталога — без этого падает
sandbox DSH (ошибка `Windows ACL temp root must be outside the workspace`).
Альтернатива — `bin\run-web.cmd` из этого репозитория: он делает то же самое
и дополнительно отказывается стартовать на занятом порту.

### Через задачу планировщика

Задача поднимает GUI независимо от сессии агента:

```powershell
schtasks /create /tn dsh-web-3080 /tr "`"$env:USERPROFILE\.dsh\locale-ru\bin\run-web.cmd`" 3080" /sc once /st 23:59 /f
taskkill /PID <pid-сервера> /T /F
taskkill /PID <pid-обёртки> /T /F
schtasks /run /tn dsh-web-3080
```

Лог: `C:\Temp\dsh-web-3080.log` (код 3 = «порт занят, не стартовал»).
Убрать задачу: `schtasks /delete /tn dsh-web-3080 /f`.

## Проверка

- В браузере: **Settings → General → Language → Русский**; интерфейс
  переключается сразу, `<html lang>` становится `ru`. Выбор сохраняется в
  `~\.dsh\settings.yaml` (секция `locale`) и переживает перезапуск.
- Индекс GUI отдаётся только по URL со стартовым токеном, который печатает сам
  `dsh web` («reopen the URL printed by dsh web»), поэтому обычный
  `Invoke-WebRequest` к порту получает **401**. Это не ошибка пакета.

## Откат

```powershell
dsh plugin --profile web remove dsh-locale-ru
```

или вручную: убрать `dsh-locale-ru` из `dependencies` и из `dsh.profile.bundles`
в `%USERPROFILE%\.dsh\profiles\web\package.json`, перезапустить GUI. Строку
`locale.preference: ru` в `settings.yaml` можно удалить, чтобы вернуться к языку
браузера.
