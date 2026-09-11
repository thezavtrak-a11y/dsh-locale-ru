# dsh-locale-ru — установка и обслуживание

## Состояние

Пакет собран, подключён к профилю `web` и подтверждён в живом GUI: в
**Settings → General → Language** появился третий язык — **Русский**.

```
C:\Users\zavtr\.dsh\profiles\web\package.json
  dependencies:  "dsh-locale-ru": "file:C:/Users/zavtr/.dsh/locale-ru"
  dsh.profile.bundles: [ @deepseek-ai/dsh-base, @deepseek-ai/dsh-web-app,
                         @tt-a1i/archify-dsh, dsh-locale-ru ]
```

Штатная команда, которой это сделано (повторять не нужно):

```
node "C:\Users\zavtr\AppData\Local\npm-cache\_npx\1e7f6d9597241db0\node_modules\@deepseek-ai\dsh\lib\bin.js" ^
  plugin --profile web add "file:C:\Users\zavtr\.dsh\locale-ru"
```

`dsh plugin` — обёртка над pnpm в каталоге профиля: `pnpm add` плюс запись строки
в `dsh.profile.bundles`. Состав дерева проверяется командой
`... bin.js --profile web --dump-config` — в выводе должен быть блок
`# == dsh-locale-ru` со строкой `- id: locale-ru`.

## Правка переводов

1. Меняем значение в `dict/ru/<namespace>.json` (источник правды; ключи не трогать).
2. `node scripts/build.mjs` — пересобирает `lib/client.js`.
3. `node scripts/check.mjs` — сверка с английским корпусом (`work/en/`):
   покрытие, пропущенные ключи, плейсхолдеры. `--strict` — режим ворот для CI.
4. `node tools/smoke.mjs .` — прогон бандла через мок-загрузчик и мок `ctx.locale`.
5. `node tools/scanner-repro.mjs .` — проверка, что строка профиля резолвится
   ровно так, как её видит сканер клиентских плагинов.
6. Перезапустить GUI (ниже), иначе сервер продолжит отдавать старый бандл.

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

# 3. поднять заново (из одного окна)
C:\Users\zavtr\.dsh\launch-web.cmd
```

`launch-web.cmd` выставляет `TEMP=C:\Temp` — без этого падает sandbox DSH.

### Через задачу планировщика

Задача `dsh-web-3080` поднимает GUI независимо от сессии агента. Лаунчер сам
отказывается стартовать на занятом порту (иначе два `dsh web` конкурируют за
порт и проигравший остаётся жив без листенера — именно так один раз и вышло).

```powershell
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
- Проверить, что URL вообще отдаёт GUI: обычный `Invoke-WebRequest` к 3080
  получает **401** — индекс отдаётся только по URL со стартовым токеном,
  который печатает сам `dsh web` («reopen the URL printed by dsh web»).
  Это не ошибка пакета.

## Откат

```
node "...\@deepseek-ai\dsh\lib\bin.js" plugin --profile web remove dsh-locale-ru
```

или вручную: убрать `dsh-locale-ru` из `dependencies` и из `dsh.profile.bundles`
в `C:\Users\zavtr\.dsh\profiles\web\package.json`, перезапустить GUI. Строку
`locale.preference: ru` в `settings.yaml` можно удалить, чтобы вернуться к языку
браузера.
