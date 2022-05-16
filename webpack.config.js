const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const resolve = require('resolve');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false';

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = !isProduction;

const isEnvProductionProfile =
    isProduction && process.argv.includes('--profile');

const imageInlineSizeLimit = parseInt(
    process.env.IMAGE_INLINE_SIZE_LIMIT || '10000'
);

const cssRegex = /\.css$/;
const sassRegex = /\.(scss|sass)$/;
const getStyleLoaders = (cssOptions, preProcessor) => {
    const loaders = [
        isDevelopment && require.resolve('style-loader'),
        isProduction && {
            loader: MiniCssExtractPlugin.loader,
         },
        {
            loader: require.resolve('css-loader'),
            options: cssOptions,
        },
        {
            loader: require.resolve('postcss-loader'),
            options: {
                postcssOptions: {
                     ident: 'postcss',
                    config: false,
                    plugins:  [
                        'postcss-flexbugs-fixes',
                        [
                            'postcss-preset-env',
                            {
                                autoprefixer: {
                                    flexbox: 'no-2009',
                                },
                                stage: 3,
                            },
                        ],
                        'postcss-normalize',
                    ]

                },
                sourceMap: isProduction ? shouldUseSourceMap : isDevelopment,
            },
        },
    ].filter(Boolean);
    if (preProcessor) {
        loaders.push(
            {
                loader: require.resolve('resolve-url-loader'),
                options: {
                    sourceMap: isProduction ? shouldUseSourceMap : isDevelopment,
                    root:path.resolve(__dirname, "src"),
                },
            },
            {
                loader: require.resolve(preProcessor),
                options: {
                    sourceMap: true,
                },
            }
        );
    }
    return loaders;
};
module.exports = {
    mode: isProduction ? 'production' : isDevelopment && 'development',
    entry: {
        index: path.resolve(__dirname,"src/index.ts"),
    },
    output: {
        pathinfo: isDevelopment,
        path: path.resolve(__dirname, 'build'),
        filename: isProduction
            ? 'static/js/[name].[contenthash:8].js'
            : isDevelopment && 'static/js/[name].bundle.js',
        chunkFilename: isProduction
            ? 'static/js/[name].[contenthash:8].chunk.js'
            : isDevelopment && 'static/js/[name].chunk.js',
        assetModuleFilename: 'static/media/[name].[hash][ext]',
        clean: true,
    },
    resolve: {
        extensions:[".ts",".tsx",".js"]
    },
    devtool: isProduction
        ? shouldUseSourceMap
            ? 'source-map'
            : false
        : isDevelopment && 'inline-source-map',
    cache: {
        type: 'filesystem',
        cacheDirectory: path.resolve(__dirname,"node_modules/.cache"),
        store: 'pack',
        buildDependencies: {
            defaultWebpack: ['webpack/lib/'],
            config: [__filename],
            tsconfig: [path.resolve(__dirname,"tsconfig.json")].filter(f =>
                fs.existsSync(f)
            ),
        },
    },
    devServer: {
        static: path.resolve(__dirname, "build"),
        hot: isDevelopment,
        watchFiles: {
            paths:["public/**/*"],
            options: {
                ignored: /node_modules/,
                usePolling: false,
            }
        }
    },
    plugins: [
        new HtmlWebpackPlugin(
            Object.assign(
                {},
                {
                    inject: true,
                    template: path.resolve(__dirname, "public/index.html"),
                },
                isProduction
                    ? {
                        minify: {
                            removeComments: true,
                            collapseWhitespace: true,
                            removeRedundantAttributes: true,
                            useShortDoctype: true,
                            removeEmptyAttributes: true,
                            removeStyleLinkTypeAttributes: true,
                            keepClosingSlash: true,
                            minifyJS: true,
                            minifyCSS: true,
                            minifyURLs: true,
                        },
                    }
                    : undefined
            )
       ),
       new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
       }),
       isDevelopment && new CaseSensitivePathsPlugin(),
       isProduction &&
       new MiniCssExtractPlugin({
           filename: "static/css/[name].[contenthash:8].css",
           chunkFilename: "static/css/[name].[contenthash:8].chunk.css",
       }),
       new ForkTsCheckerWebpackPlugin({
           async: isDevelopment,
           typescript: {
               typescriptPath: resolve.sync('typescript', {
                   basedir: path.resolve(__dirname, "node_modules"),
               }),
               configOverwrite: {
                   compilerOptions: {
                       sourceMap: isProduction
                           ? shouldUseSourceMap
                           : isDevelopment,
                       skipLibCheck: true,
                       inlineSourceMap: false,
                       declarationMap: false,
                       noEmit: true,
                       incremental: true,
                       tsBuildInfoFile: path.resolve(__dirname,"node_modules/.cache/tsconfig.tsbuildinfo"),
                   },
               },
               context: path.resolve(__dirname),
               diagnosticOptions: {
                   syntactic: true,
               },
               mode: 'write-references',
               profile: true,
           },
       }),
    ].filter(Boolean),
    optimization: {
        runtimeChunk: 'single',
        minimize: isProduction,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    parse: {
                         ecma: 8,
                    },
                    compress: {
                        ecma: 5,
                        warnings: false,
                        comparisons: false,
                         inline: 2,
                    },
                    mangle: {
                        safari10: true,
                    },
                    keep_classnames: isEnvProductionProfile,
                    keep_fnames: isEnvProductionProfile,
                    output: {
                        ecma: 5,
                        comments: false,
                         ascii_only: true,
                    },
                },
            }),
            new CssMinimizerPlugin(),
        ],
    },
    module: {
        rules: [
            {
              test: /\.tsx?$/,
              exclude: /node_modules/,
              use: require.resolve('ts-loader'),
            },
            {
                oneOf: [
                    {
                        test: [/\.avif$/],
                        type: 'asset',
                        mimetype: 'image/avif',
                        parser: {
                            dataUrlCondition: {
                                maxSize: imageInlineSizeLimit,
                            },
                        },
                    },
                    {
                        test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
                        type: 'asset',
                        parser: {
                            dataUrlCondition: {
                                maxSize: imageInlineSizeLimit,
                            },
                        },
                    },
                    {
                        test: /\.svg$/,
                        use: [
                            {
                                loader: require.resolve('@svgr/webpack'),
                                options: {
                                    prettier: false,
                                    svgo: false,
                                    svgoConfig: {
                                        plugins: [{ removeViewBox: false }],
                                    },
                                    titleProp: true,
                                    ref: true,
                                },
                            },
                            {
                                loader: require.resolve('file-loader'),
                                options: {
                                    name: 'static/media/[name].[hash].[ext]',
                                },
                            },
                        ],
                        issuer: {
                            and: [/\.(ts|tsx|js|jsx|md|mdx)$/],
                        },
                    },
                    {
                        test: /\.html$/i,
                        loader: "html-loader",
                    },
                    {
                        test: cssRegex,
                        use: getStyleLoaders({
                            importLoaders: 1,
                            sourceMap: isProduction
                                ? shouldUseSourceMap
                                : isDevelopment,
                            modules: {
                                mode: 'icss',
                            },
                        }),
                        sideEffects: true,
                    },
                    {
                        test: sassRegex,
                        use: getStyleLoaders(
                            {
                                importLoaders: 3,
                                sourceMap: isProduction
                                    ? shouldUseSourceMap
                                    : isDevelopment,
                                modules: {
                                    mode: 'icss',
                                },
                            },
                            'sass-loader'
                        ),
                        sideEffects: true,
                    },
                    {
                        exclude: [/^$/, /\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
                        type: 'asset/resource',
                    },
                ]
            },
        ]
    }
};
