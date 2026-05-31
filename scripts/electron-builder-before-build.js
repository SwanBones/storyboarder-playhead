const fs = require('fs')
const path = require('path')

exports.default = async function beforeBuild (context) {
  console.log('  + scripts/electron-builder-before-build.js')

  let pathToNodeModules = path.join(__dirname, '..', 'node_modules')

  // node_modules deletion skipped: only needed for cross-compilation (e.g. Mac→Win via Docker)
  // Native Windows builds already have the correct ffmpeg-static binary

  return true
}
