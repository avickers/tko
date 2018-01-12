/**
 * Config for karma.
 */
const fs = require('fs')
const path = require('path')
const nodeResolve = require('rollup-plugin-node-resolve')
const rollupCommonJS = require('rollup-plugin-commonjs')
const rollupVisualizer = require('rollup-plugin-visualizer')
const typescript = require('typescript')

const {argv} = process
const root = path.join(process.cwd(), 'spec')

const PACKAGES_PATH = path.join(__dirname, '..', 'packages')
const pkg = JSON.parse(fs.readFileSync('package.json'))

console.log(`
    🏕  Karma being loaded at:
        ${process.cwd()}
`)

if (!pkg.karma || !pkg.karma.frameworks) {
  console.warn(`
    ⚠️  package.json at ${process.cwd()} does not have "karma.frameworks"
  `)
  process.exit()
}

const replacerPlugin = {
  name: 'tko-package-imports',
  /**
   * Resolve the path of tko.* packages, so
   *
   *    tko.utils   =>   packages/tko.utils/src/index.js
   *
   * We use sources so that we don't have multiple references
   * from different sources e.g. `tko.computed` and `tko.observable`
   * both importing `tko.utils` would generate multiple versions
   * of objectMap that rollup transpiles as objectMap$1 and
   * objectMap$2.
   *
   * Plus by doing this we won't need to rebuild dist/ files
   * whenever we make changes to the source.
   */
  resolveId (importee, importer) {
    if (importee.includes('/')) { return }
    const packagePath = path.join(PACKAGES_PATH, importee, 'src/index.js')
    if (fs.existsSync(packagePath)) { return packagePath }
  }
}

const rollupPreprocessor = {
  output: {
    format: 'iife',
    name: pkg.name,
    /**
     * Source maps often link multiple files (e.g. tko.utils/src/object.js)
     * from different spec/ files.  This causes problems e.g. a breakpoints
     * occur in the wrong spec/ file.
     *
     * Nevertheless enabling source maps when there's only one test file
     * can be illuminating, so it's an option.
     */
    sourcemap: argv.includes('--sourcemap') ? 'inline' : false
  },

  plugins: [
    replacerPlugin,
    nodeResolve({ module: true }),
    rollupCommonJS(),
    rollupVisualizer({ filename: './visual.html' })
  ]
}

const typescriptPreprocessor = {
  typescript,
  options: {
    target: 'ES5',
    lib: ['DOM', 'ES5', 'ES6', 'ScriptHost', 'ES2015', 'ES2016', 'ES2017'],
    removeComments: false,
    downlevelIteration: true
  }
}

const COMMON_CONFIG = {
  rollupPreprocessor,
  typescriptPreprocessor,
  basePath: process.cwd(),
  frameworks: pkg.karma.frameworks,
  resolve: { root },
  files: pkg.karma.files || [
    { pattern: 'spec/**/*.js', watched: false }
  ],
  preprocessors: {
    'spec/**/*.js': ['rollup', 'typescript']
  }
}

module.exports = {COMMON_CONFIG, pkg}
