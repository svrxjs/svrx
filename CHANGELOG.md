## v1.0.6 (2019-11-01)

#### :bug: Bug Fix
* `svrx`
  * [#145](https://github.com/svrxjs/svrx/pull/145) Fix windows path parse error ([@int64ago](https://github.com/int64ago))
  * [#143](https://github.com/svrxjs/svrx/pull/143) Fix livereload client error ([@leeluolee](https://github.com/leeluolee))

## v1.0.5 (2019-10-29)

#### :bug: Bug Fix
* `svrx-util`, `svrx`
  * [#135](https://github.com/svrxjs/svrx/pull/135) Fix not working on Windows ([@xuchaoying](https://github.com/xuchaoying))
* `svrx-util`
  * [#134](https://github.com/svrxjs/svrx/pull/134) Fix wrong log display for scoped plugin ([@int64ago](https://github.com/int64ago))
  * [#129](https://github.com/svrxjs/svrx/pull/129) Prevent modify package.json when plugin installation ([@xuchaoying](https://github.com/xuchaoying))
* `svrx`
  * [#132](https://github.com/svrxjs/svrx/pull/132) Fix process exit not working on Windows ([@xuchaoying](https://github.com/xuchaoying))

## v1.0.4 (2019-10-18)

#### :bug: Bug Fix
* `svrx`
  * [#112](https://github.com/svrxjs/svrx/pull/112) Fix css is not appended if there's no <head> tag ([@leeluolee](https://github.com/leeluolee))
  * [#119](https://github.com/svrxjs/svrx/pull/119) Fix routing update not working ([@leeluolee](https://github.com/leeluolee))
  * [#120](https://github.com/svrxjs/svrx/pull/120) Fix scripts injecting bug ([@leeluolee](https://github.com/leeluolee))

## v1.0.3 (2019-10-11)

#### :rocket: New Feature
* `svrx-util`, `svrx`
  * [#110](https://github.com/svrxjs/svrx/pull/110) Add watch(), del(), splice() to config ([@xuchaoying](https://github.com/xuchaoying))

## v1.0.0 (2019-09-20)

#### :rocket: New Feature
* `svrx`
  * [#90](https://github.com/svrxjs/svrx/pull/90) Add plublic events ([@leeluolee](https://github.com/leeluolee))
  * [#86](https://github.com/svrxjs/svrx/pull/86) Alias registService to regist ([@leeluolee](https://github.com/leeluolee))

#### :bug: Bug Fix
* `svrx`
  * [#84](https://github.com/svrxjs/svrx/pull/84) Fix dashed plugin name parse error ([@xuchaoying](https://github.com/xuchaoying))
* `svrx-util`, `svrx`
  * [#83](https://github.com/svrxjs/svrx/pull/83) Return the right package info after npmi ([@xuchaoying](https://github.com/xuchaoying))

## 0.0.9 (2019-09-04)

## 0.0.8 (2019-09-04)

#### :bug: Bug Fix
* `svrx`
  * [#77](https://github.com/svrxjs/svrx/pull/77) Fix number check for option value ([@xuchaoying](https://github.com/xuchaoying))

## v0.0.7 (2019-08-26)

#### :boom: Breaking Change
* `svrx-util`, `svrx`
  * [#66](https://github.com/svrxjs/svrx/pull/66) Set default value of proxy.changeOrigin to true ([@xuchaoying](https://github.com/xuchaoying))

#### :bug: Bug Fix
* `svrx`
  * [#26](https://github.com/svrxjs/svrx/pull/26) Fix parse plugin querystring with dot string ([@xuchaoying](https://github.com/xuchaoying))
  * [#27](https://github.com/svrxjs/svrx/pull/27) Fix router not work when historyfallback set to true ([@xuchaoying](https://github.com/xuchaoying))

#### :nail_care: Enhancement
* `svrx-util`, `svrx`
  * [#28](https://github.com/svrxjs/svrx/pull/28) Enable multi-process asynchronous plugin installation ([@leeluolee](https://github.com/leeluolee))
* `svrx`
  * [#25](https://github.com/svrxjs/svrx/pull/25) Support relative path to open plugin ([@leeluolee](https://github.com/leeluolee))

## v0.0.6 (2019-07-30)

#### :bug: Bug Fix
* `svrx`
  * [#22](https://github.com/svrxjs/svrx/pull/22) Fix config.get() to get all default values ([@xuchaoying](https://github.com/xuchaoying))

#### :nail_care: Enhancement
* `svrx`
  * [#23](https://github.com/svrxjs/svrx/pull/23) Add plugin version match check ([@xuchaoying](https://github.com/xuchaoying))

## v0.0.5 (2019-07-25)

#### :bug: Bug Fix
* `svrx`
  * [#17](https://github.com/svrxjs/svrx/pull/17) Set charset for injected script ([@xuchaoying](https://github.com/xuchaoying))
  * [#19](https://github.com/svrxjs/svrx/pull/19) Fix https not working ([@leeluolee](https://github.com/leeluolee))

## v0.0.4 (2019-07-16)

#### :rocket: New Feature
* `svrx`
  * [#12](https://github.com/svrxjs/svrx/pull/12) Add proxy action ([@xuchaoying](https://github.com/xuchaoying))
  * [#11](https://github.com/svrxjs/svrx/pull/11) Add --plugin to define plugin and options ([@xuchaoying](https://github.com/xuchaoying))

#### :nail_care: Enhancement
* `svrx`
  * [#9](https://github.com/svrxjs/svrx/pull/9) Add global rc config ([@xuchaoying](https://github.com/xuchaoying))
* `svrx`
  * [#8](https://github.com/svrxjs/svrx/pull/8) Enhance help print ([@xuchaoying](https://github.com/xuchaoying))
