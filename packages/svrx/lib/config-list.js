const { GROUPS } = require('./constant');

module.exports = {
  root: {
    type: 'string',
    default: process.cwd(),
    description: 'where to start svrx',
    defaultHint: 'default to the current working directory',
    group: GROUPS.CORE,
    cli: false,
    ui: false,
  },
  svrx: {
    type: 'string',
    description: 'the version of svrx you want to use',
    defaultHint: 'default to the latest version installed locally',
    group: GROUPS.CORE,
    ui: false,
  },
  path: {
    type: 'string',
    description: 'the path of local svrx core package(for development)',
    group: GROUPS.CORE,
    ui: false,
  },
  registry: {
    type: 'string',
    description: 'the registry of npm',
    group: GROUPS.CORE,
  },
  port: {
    type: 'number',
    default: 8000,
    description: 'Specify a port number to listen for requests on',
    group: GROUPS.CORE,
  },
  https: {
    description: 'enable https',
    type: 'boolean',
    default: false,
    group: GROUPS.CORE,
  },
  route: {
    description: 'the path of routing config file',
    anyOf: [{
      title: 'one file',
      type: 'string',
    }, {
      title: 'several files',
      type: 'array',
      items: {
        type: 'string',
      },
    }],
    group: GROUPS.CORE,
  },
  historyApiFallback: {
    group: GROUPS.CORE,
    description: 'Enable historyApiFallback middleware',
    anyOf: [{
      title: 'enable historyApiFallback',
      type: 'boolean',
    }, {
      title: 'more configs of historyApiFallback(in object)',
      type: 'object',
      additionalProperties: { type: 'string' },
    }],
    default: false,
  },
  plugin: {
    group: GROUPS.CORE,
    alias: 'p',
    description: 'Add a plugin by "[@{scope}/]{name}[@{version}][?{optionsQueryString}]"',
    anyOf: [
      { type: 'string' },
      { type: 'array', items: { type: 'string' } },
    ],
    ui: false,
  },
  urls: {
    type: 'object',
    cli: false,
    ui: false,
    properties: {
      style: {
        type: 'string',
        default: '/svrx/svrx-client.css',
        group: GROUPS.CORE,
      },
      script: {
        type: 'string',
        default: '/svrx/svrx-client.js',
        group: GROUPS.CORE,
      },
      external: {
        type: 'string',
        group: GROUPS.CORE,
      },
      local: {
        type: 'string',
        group: GROUPS.CORE,
      },
      ui: {
        type: 'string',
        group: GROUPS.CORE,
      },
    },
  },
  plugins: {
    type: 'array',
    group: GROUPS.CORE,
    cli: false,
    ui: false,
  },
  middlewares: {
    type: 'array',
    group: GROUPS.CORE,
    cli: false,
    ui: false,
  },

  // built plugin configs
  serve: {
    description: 'dev server configs',
    group: GROUPS.COMMON,
    default: true,
    anyOf: [
      {
        title: 'enable dev server',
        type: 'boolean',
      },
      {
        title: 'more configs of dev server',
        type: 'object',
        properties: {
          base: {
            type: 'string',
            description: 'where to serve static content from',
          },
          index: {
            type: 'string',
            description: 'Name of the index file to serve automatically when visiting the root location',
            defaultHint: 'default to "index.html"',
          },
          directory: {
            type: 'boolean',
            description: 'Enable serveIndex middleware',
          },
        },
      },
    ],
  },

  proxy: {
    description: 'proxy requests configs',
    group: GROUPS.COMMON,
    anyOf: [
      {
        title: 'enable proxy',
        type: 'boolean',
      },
      {
        title: 'more configs of proxy(in object)',
        type: 'object',
        additionalProperties: { type: 'string' },
      },
      {
        title: 'more configs of proxy(in array of object)',
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    ],
  },

  livereload: {
    description: 'enable auto live reload',
    group: GROUPS.COMMON,
    default: true,
    anyOf: [
      {
        title: 'enable livereload',
        type: 'boolean',
      },
      {
        title: 'more configs of livereload',
        type: 'object',
        properties: {
          exclude: {
            description: 'specify patterns to exclude from file watchlist',
            anyOf: [
              { title: 'one pattern', type: 'string' },
              { title: 'several pattern', type: 'array', items: { type: 'string' } },
            ],
          },
        },
      },
    ],
  },

  cors: {
    description: 'Cross-Origin Resource Sharing(CORS)',
    group: GROUPS.COMMON,
    default: true,
    anyOf: [
      {
        title: 'enable cors',
        type: 'boolean',
      },
      {
        title: 'more configs of cors(in object)',
        type: 'object',
        additionalProperties: { type: 'string' },
      },
    ],
  },
  open: {
    description: 'open target page after server start',
    group: GROUPS.COMMON,
    default: 'local',
    anyOf: [
      {
        title: 'enable auto browser opening',
        type: 'boolean',
      },
      {
        title: 'open \'local\', \'external\' or other file name',
        type: 'string',
      },
    ],
  },
  logger: {
    description: 'global logger setting',
    group: GROUPS.COMMON,
    type: 'object',
    properties: {
      level: {
        type: 'string',
        enum: [
          'silent',
          'notify',
          'error',
          'warn',
          'debug',
        ],
        default: 'warn',
        description: 'set log level, predefined values: \'silent\',\'notify\',\'error\',\'warn\', \'debug\'',
      },
    },
  },
};
