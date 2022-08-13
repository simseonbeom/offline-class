// 📁 build-theme.js 


/* 사용자 정의 구성 --------------------------------------------------------------- */

// 입력 디렉토리 이름
const INPUT_DIR = 'theme';

// 출력 디렉토리 이름
const OUTPUT_DIR = 'theme';

// 멀티 테마 이름
const THEMES = 'global dark light';

// 플랫폼 포멧
// - js (ES6)
// - jsModule (CommonJS)
const PLATFORMS = 'css scss js jsModule';

/* 스타일 딕셔너리 모듈 ------------------------------------------------------------ */

const S = require('style-dictionary');

/* 유틸리티 함수 ------------------------------------------------------------------ */

function isPx(value) {
  // eslint-disable-next-line no-useless-escape
  return /[\d\.]+px$/.test(value);
}

function transformShadow(shadow) {
  const { x, y, blur, spread, color } = shadow;
  return `${x} ${y} ${blur} ${spread} ${color}`;
}

/* CSS 변수 포멧 ---------------------------------------------------------------- */

S.registerFormat({
  name: 'css/variables',
  formatter(dictionary /* , config */) {
    return `${this.selector} {
${dictionary.allProperties
  .map(({ name, value }) => `  --${name}: ${value};`)
  .join('\n')}
}`;
  },
});

// 포멧 구성 함수
const setCSS = (theme) => ({
  buildPath: `${OUTPUT_DIR}/`,
  transforms: [
    'attribute/cti',
    'name/cti/kebab',
    'sizes/px',
    'shadow/shorthand',
    'pxToRem',
    'typography/shorthand',
  ],
  files: [
    {
      destination: `css/${theme}.css`,
      format: 'css/variables',
      selector: theme.includes('global') ? ':root' : `.${theme}-theme`,
    },
  ],
});

/* SCSS 포멧 ------------------------------------------------------------------ */

const setSCSS = (theme) => ({
  buildPath: `${OUTPUT_DIR}/`,
  transforms: [
    'attribute/cti',
    'name/cti/kebab',
    'sizes/px',
    'shadow/shorthand',
    'pxToRem',
    'typography/shorthand',
  ],
  files: [
    {
      destination: `scss/${theme}.scss`,
      format: `scss/variables`,
    },
  ],
});

/* JavaScript 변수 이름 포멧 ------------------------------------------------------ */
// 예: `namespace.item.variant.property.modifier`

S.registerTransform({
  name: 'name/js',
  type: 'name',
  transformer: (token) => token.path.join('.'),
});

// 포멧 구성 함수
const setJS = (theme) => ({
  buildPath: `${OUTPUT_DIR}/`,
  transforms: ['name/js/es6', 'pxToRem'],
  files: [
    {
      destination: `js/esm/${theme}.js`,
      format: `javascript/es6`,
    },
  ],
});

/* ES6 변수 이름 포멧 ------------------------------------------------------------- */
// 예: `NamespaceItemVariantPropertyModifier`

S.registerTransform({
  name: 'name/js/es6',
  type: 'name',
  transformer(token) {
    const tokenPath = token.path.join(' ');
    const tokenPathItems = tokenPath.split(' ');
    for (var i = 0, l = tokenPathItems.length; i < l; ++i) {
      tokenPathItems[i] =
        tokenPathItems[i].charAt(0).toUpperCase() + tokenPathItems[i].slice(1);
    }
    const tokenName = tokenPathItems.join('');
    return tokenName;
  },
});

// 포멧 구성 함수
const setJsModule = (theme) => ({
  buildPath: `${OUTPUT_DIR}/`,
  transforms: ['pxToRem'],
  files: [
    {
      destination: `js/module/${theme}.js`,
      format: `javascript/module`,
    },
  ],
});

/* JavaScript 모듈 포멧 --------------------------------------------------------- */

const { fileHeader } = S.formatHelpers;

S.registerFormat({
  name: 'javascript/module',
  formatter({ dictionary, file }) {
    const recursiveleyFlattenDictionary = (obj) => {
      const tree = {};
      if (typeof obj !== 'object' || Array.isArray(obj)) {
        return obj;
      }

      if (obj.hasOwnProperty.call(obj, 'value')) {
        return obj.value;
      } else {
        for (const name in obj) {
          if (obj.hasOwnProperty.call(obj, name)) {
            tree[name] = recursiveleyFlattenDictionary(obj[name]);
          }
        }
      }
      return tree;
    };

    return (
      fileHeader({ file }) +
      'module.exports = ' +
      JSON.stringify(recursiveleyFlattenDictionary(dictionary.tokens), null, 2)
    );
  },
});

/* 변환 등록 -------------------------------------------------------------------- */

S.registerTransform({
  name: 'sizes/px',
  type: 'value',
  matcher(prop) {
    const props = 'fontSize spacing borderRadius borderWidth sizing';
    return props.split(' ').includes(prop.attributes.category);
  },
  transformer(prop) {
    return `${parseFloat(prop.original.value, 10)}px`;
  },
});

/* 스타일 딕셔너리 구성 유틸리티 함수 ------------------------------------------------- */

const getStyleDictionaryConfig = (theme) => ({
  source: [`${INPUT_DIR}/${theme}.json`],
  platforms: {
    css: setCSS(theme),
    scss: setSCSS(theme),
    js: setJS(theme),
    jsModule: setJsModule(theme),
  },
});

/* 트랜스폼 --------------------------------------------------------------------- */

// px → rem 변경
S.registerTransform({
  name: 'pxToRem',
  type: 'value',
  transformer(token) {
    if (isPx(token.value)) {
      const baseFontSize = 16;
      const floatValue = parseFloat(token.value.replace('px', ''));

      if (isNaN(floatValue)) {
        return token.value;
      }

      if (floatValue === 0) {
        return '0';
      }

      return `${floatValue / baseFontSize}rem`;
    }
    return token.value;
  },
});

// CSS Shadow 단축 속성 변경
S.registerTransform({
  name: 'shadow/shorthand',
  type: 'value',
  transitive: true,
  matcher: (token) => ['boxShadow'].includes(token.type),
  transformer(token) {
    return Array.isArray(token.original.value)
      ? token.original.value.map((single) => transformShadow(single)).join(', ')
      : transformShadow(token.original.value);
  },
});

// 타이포그래피 단축 속성 변경
S.registerTransform({
  name: 'typography/shorthand',
  type: 'value',
  transitive: true,
  matcher: (token) => token.type === 'typography',
  transformer(token) {
    const { value } = token;
    return `${value.fontWeight} ${value.fontSize}/${value.lineHeight} ${value.fontFamily}`;
  },
});

/* 빌드 ----------------------------------------------------------------------- */

console.log('🪩  테마 빌드 START ---------------');
THEMES.split(' ').map((theme) => {
  const SD = S.extend(getStyleDictionaryConfig(theme));
  PLATFORMS.split(' ').map((platform) => SD.buildPlatform(platform));
});
console.log('\n🪩  테마 빌드 FINISHED ------------\n');