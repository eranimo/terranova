# TerraNova
World generator in Typescript.


## Live Demo
http://terranova.kaelan.org/
(requires Chrome 70+, or Firefox with SharedArrayBuffers enabled)

Build status: [![CircleCI](https://circleci.com/gh/eranimo/terranova.svg?style=svg)](https://circleci.com/gh/eranimo/terranova)

## Install
- `npm run dev`: starts webpack dev server
- `npm run build`: builds for production


## Releasing
Currently, all commits to master will automatically release to production. Versions are used to track incompatible changes and warn the user when their saved games or worlds are obsolete. These warnings are based on the `package.json` version.

### When to release
- When the world generator is changed
- When the game code is changed

### How to release
We use [release-it](https://github.com/webpro/release-it) to handle releases. This is configured to update the npm package version (we don't publish to npm) and push git tags, which are available on Github.

e.g.: `npx release-it minor`
