'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _toConsumableArray = _interopDefault(require('babel-runtime/helpers/toConsumableArray'));
var _extends = _interopDefault(require('babel-runtime/helpers/extends'));
var _Object$getPrototypeOf = _interopDefault(require('babel-runtime/core-js/object/get-prototype-of'));
var _classCallCheck = _interopDefault(require('babel-runtime/helpers/classCallCheck'));
var _possibleConstructorReturn = _interopDefault(require('babel-runtime/helpers/possibleConstructorReturn'));
var _inherits = _interopDefault(require('babel-runtime/helpers/inherits'));
var _ = require('lodash');
var ___default = _interopDefault(_);
var juice = _interopDefault(require('juice'));
var jsBeautify = require('js-beautify');
var htmlparser = _interopDefault(require('htmlparser2'));
var isObject = _interopDefault(require('lodash/isObject'));
var findLastIndex = _interopDefault(require('lodash/findLastIndex'));
var find = _interopDefault(require('lodash/find'));
var filter = _interopDefault(require('lodash/fp/filter'));
var map = _interopDefault(require('lodash/fp/map'));
var flow = _interopDefault(require('lodash/fp/flow'));
var _Object$keys = _interopDefault(require('babel-runtime/core-js/object/keys'));
var mapValues = _interopDefault(require('lodash/mapValues'));
var forEach = _interopDefault(require('lodash/forEach'));
var warning = _interopDefault(require('warning'));
var concat = _interopDefault(require('lodash/concat'));
var keys = _interopDefault(require('lodash/keys'));
var includes = _interopDefault(require('lodash/includes'));
var filter$1 = _interopDefault(require('lodash/filter'));
var _typeof = _interopDefault(require('babel-runtime/helpers/typeof'));
var kebabCase = _interopDefault(require('lodash/kebabCase'));
var map$1 = _interopDefault(require('lodash/map'));
var _createClass = _interopDefault(require('babel-runtime/helpers/createClass'));
var some = _interopDefault(require('lodash/some'));
var escapeRegExp = _interopDefault(require('lodash/escapeRegExp'));
var _defineProperty = _interopDefault(require('babel-runtime/helpers/defineProperty'));
var crypto = _interopDefault(require('crypto'));
var url = _interopDefault(require('url'));
var range = _interopDefault(require('lodash/range'));
var repeat = _interopDefault(require('lodash/repeat'));
var min = _interopDefault(require('lodash/min'));
var omit = _interopDefault(require('lodash/omit'));
var reduce = _interopDefault(require('lodash/reduce'));
var fp = require('lodash/fp');

function cleanNode(node) {
  delete node.parent;

  // Delete children if needed
  if (node.children && node.children.length) {
    ___default.forEach(node.children, cleanNode);
  } else {
    delete node.children;
  }

  // Delete attributes if needed
  if (node.attributes && _Object$keys(node.attributes).length === 0) {
    delete node.attributes;
  }
}

/**
 * Convert "true" and "false" string attributes values
 * to corresponding Booleans
 */

function convertBooleansOnAttrs(attrs) {
  return mapValues(attrs, function (val) {
    if (val === 'true') {
      return true;
    }
    if (val === 'false') {
      return false;
    }

    return val;
  });
}

function setEmptyAttributes(node) {
  if (!node.attributes) {
    node.attributes = {};
  }
  if (node.children) {
    forEach(node.children, setEmptyAttributes);
  }
}

var indexesForNewLine = function indexesForNewLine(xml) {
  var regex = /\n/gi;
  var indexes = [0];

  while (regex.exec(xml)) {
    indexes.push(regex.lastIndex);
  }

  return indexes;
};

var isSelfClosing = function isSelfClosing(indexes, parser) {
  return indexes.startIndex === parser.startIndex && indexes.endIndex === parser.endIndex;
};

function MJMLParser(xml) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var includedIn = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  var _options$addEmptyAttr = options.addEmptyAttributes,
      addEmptyAttributes = _options$addEmptyAttr === undefined ? true : _options$addEmptyAttr,
      _options$components = options.components,
      components = _options$components === undefined ? {} : _options$components,
      _options$convertBoole = options.convertBooleans,
      convertBooleans = _options$convertBoole === undefined ? true : _options$convertBoole,
      _options$keepComments = options.keepComments,
      keepComments = _options$keepComments === undefined ? true : _options$keepComments,
      _options$filePath = options.filePath,
      filePath = _options$filePath === undefined ? '.' : _options$filePath,
      _options$ignoreInclud = options.ignoreIncludes,
      ignoreIncludes = _options$ignoreInclud === undefined ? false : _options$ignoreInclud;


  var endingTags = flow(filter(function (component) {
    return component.endingTag;
  }), map(function (component) {
    return component.getTagName();
  }))(_extends({}, components));

  var mjml = null;
  var cur = null;
  var inInclude = !!includedIn.length;
  var inEndingTag = 0;
  var currentEndingTagIndexes = { startIndex: 0, endIndex: 0 };

  var lineIndexes = indexesForNewLine(xml);

  var parser = new htmlparser.Parser({
    onopentag: function onopentag(name, attrs) {
      var isAnEndingTag = endingTags.indexOf(name) !== -1;

      if (inEndingTag > 0) {
        if (isAnEndingTag) inEndingTag += 1;
        return;
      }

      if (isAnEndingTag) {
        inEndingTag += 1;

        if (inEndingTag === 1) {
          // we're entering endingTag
          currentEndingTagIndexes.startIndex = parser.startIndex;
          currentEndingTagIndexes.endIndex = parser.endIndex;
        }
      }

      var line = findLastIndex(lineIndexes, function (i) {
        return i <= parser.startIndex;
      }) + 1;

      if (name === 'mj-include' && !ignoreIncludes) {
        inInclude = true;
        return;
      }

      if (convertBooleans) {
        // "true" and "false" will be converted to bools
        attrs = convertBooleansOnAttrs(attrs);
      }

      var newNode = {
        file: filePath,
        absoluteFilePath: '',
        line: line,
        includedIn: includedIn,
        parent: cur,
        tagName: name,
        attributes: attrs,
        children: []
      };

      if (cur) {
        cur.children.push(newNode);
      } else {
        mjml = newNode;
      }

      cur = newNode;
    },
    onclosetag: function onclosetag(name) {
      if (endingTags.indexOf(name) !== -1) {
        inEndingTag -= 1;

        if (!inEndingTag) {
          // we're getting out of endingTag
          // if self-closing tag we don't get the content
          if (!isSelfClosing(currentEndingTagIndexes, parser)) {
            var partialVal = xml.substring(currentEndingTagIndexes.endIndex + 1, parser.endIndex).trim();
            var val = partialVal.substring(0, partialVal.lastIndexOf('</' + name));

            if (val) cur.content = val.trim();
          }
        }
      }

      if (inEndingTag > 0) return;

      if (inInclude) {
        inInclude = false;
      }

      // for includes, setting cur is handled in handleInclude because when there is
      // only mj-head in include it doesn't create any elements, so setting back to parent is wrong
      if (name !== 'mj-include') cur = cur && cur.parent || null;
    },
    ontext: function ontext(text) {
      if (inEndingTag > 0) return;

      if (text && text.trim() && cur) {
        cur.content = ('' + (cur && cur.content || '') + text.trim()).trim();
      }
    },
    oncomment: function oncomment(data) {
      if (inEndingTag > 0) return;

      if (cur && keepComments) {
        cur.children.push({
          line: findLastIndex(lineIndexes, function (i) {
            return i <= parser.startIndex;
          }) + 1,
          tagName: 'mj-raw',
          content: '<!-- ' + data.trim() + ' -->',
          includedIn: includedIn
        });
      }
    }
  }, {
    recognizeCDATA: true,
    decodeEntities: false,
    recognizeSelfClosing: true,
    lowerCaseAttributeNames: false
  });

  parser.write(xml);
  parser.end();

  if (!isObject(mjml)) {
    throw new Error('Parsing failed. Check your mjml.');
  }

  cleanNode(mjml);

  // Assign "attributes" property if not set
  if (addEmptyAttributes) {
    setEmptyAttributes(mjml);
  }

  return mjml;
}

function formatInclude(element) {
  var includedIn = element.includedIn;

  if (!(includedIn && includedIn.length)) return '';

  var formattedIncluded = includedIn.slice().reverse().map(function (_ref) {
    var line = _ref.line,
        file = _ref.file;
    return 'line ' + line + ' of file ' + file;
  }).join(', itself included at ');

  return ', included at ' + formattedIncluded;
}

function ruleError(message, element) {
  var line = element.line,
      tagName = element.tagName,
      absoluteFilePath = element.absoluteFilePath;


  return {
    line: line,
    message: message,
    tagName: tagName,
    formattedMessage: 'Line ' + line + ' of ' + absoluteFilePath + formatInclude(element) + ' (' + tagName + ') \u2014 ' + message
  };
}

var WHITELIST = ['mj-class', 'css-class'];

function validateAttribute(element, _ref) {
  var components = _ref.components;
  var attributes = element.attributes,
      tagName = element.tagName;


  var Component = components[tagName];

  if (!Component) {
    return null;
  }

  var availableAttributes = concat(keys(Component.allowedAttributes), WHITELIST);
  var unknownAttributes = filter$1(keys(attributes), function (attribute) {
    return !includes(availableAttributes, attribute);
  });

  if (unknownAttributes.length === 0) {
    return null;
  }

  var _attribute$illegal = {
    attribute: unknownAttributes.length > 1 ? 'Attributes' : 'Attribute',
    illegal: unknownAttributes.length > 1 ? 'are illegal' : 'is illegal'
  },
      attribute = _attribute$illegal.attribute,
      illegal = _attribute$illegal.illegal;


  return ruleError(attribute + ' ' + unknownAttributes.join(', ') + ' ' + illegal, element);
}

// eslint-disable-next-line consistent-return
function mergeArrays(objValue, srcValue) {
  if (_.isArray(objValue) && _.isArray(srcValue)) {
    return objValue.concat(srcValue);
  }
}

var dependencies = {};

var registerDependencies = function registerDependencies(dep) {
  return _.mergeWith(dependencies, dep, mergeArrays);
};

function validChildren(element, _ref) {
  var components = _ref.components,
      skipElements = _ref.skipElements;
  var children = element.children,
      tagName = element.tagName;


  var Component = components[tagName];

  if (!Component || !children || !children.length) {
    return null;
  }

  return filter$1(children.map(function (child) {
    var childTagName = child.tagName;
    var ChildComponent = components[childTagName];
    var parentDependencies = dependencies[tagName] || [];

    if (!ChildComponent || includes(skipElements, childTagName) || includes(parentDependencies, childTagName) || parentDependencies.some(function (dep) {
      return dep instanceof RegExp && dep.test(childTagName);
    })) {
      return null;
    }

    var allowedDependencies = keys(dependencies).filter(function (key) {
      return includes(dependencies[key], childTagName) || dependencies[key].some(function (dep) {
        return dep instanceof RegExp && dep.test(childTagName);
      });
    });

    return ruleError(childTagName + ' cannot be used inside ' + tagName + ', only inside: ' + allowedDependencies.join(', '), child);
  }));
}

// Tags that have no associated components but are allowed even so
var componentLessTags = ['mj-all', 'mj-class'];

function validateTag(element, _ref) {
  var components = _ref.components;
  var tagName = element.tagName;


  if (_.includes(componentLessTags, tagName)) return null;

  var Component = components[tagName];

  if (!Component) {
    return ruleError('Element ' + tagName + ' doesn\'t exist or is not registered', element);
  }

  return null;
}

function validateType(element, _ref) {
  var components = _ref.components,
      initializeType = _ref.initializeType;
  var attributes = element.attributes,
      tagName = element.tagName;


  var Component = components[tagName];

  if (!Component) {
    return null;
  }

  return _.compact(_.map(attributes, function (value, attr) {
    var attrType = Component.allowedAttributes && Component.allowedAttributes[attr];
    if (!attrType) return null; // attribute not allowed

    var TypeChecker = initializeType(attrType);
    var result = new TypeChecker(value);
    if (result.isValid()) return null;
    return ruleError('Attribute ' + attr + ' ' + result.getErrorMessage(), element);
  }));
}



var rules = /*#__PURE__*/Object.freeze({
  validAttributes: validateAttribute,
  validChildren: validChildren,
  validTag: validateTag,
  validTypes: validateType
});

var MJMLRulesCollection = {};

function registerRule(rule, name) {
  if (typeof rule !== 'function') {
    return warning(false, 'Your rule must be a function');
  }

  if (name) {
    MJMLRulesCollection[name] = rule;
  } else {
    MJMLRulesCollection[rule.name] = rule;
  }

  return true;
}

_.mapKeys(rules, function (func, name) {
  return registerRule(func, name);
});

var SKIP_ELEMENTS = ['mjml'];

function MJMLValidator(element) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var children = element.children,
      tagName = element.tagName;

  var errors = void 0;

  var skipElements = options.skipElements || SKIP_ELEMENTS;

  if (!_.includes(skipElements, tagName)) {
    errors = _.flatten(_.concat.apply(undefined, [errors].concat(_toConsumableArray(_.values(MJMLRulesCollection).map(function (rule) {
      return rule(element, _extends({
        skipElements: skipElements
      }, options));
    })))));
  }

  if (children && children.length > 0) {
    errors = _.flatten(_.concat.apply(undefined, [errors].concat(_toConsumableArray(children.map(function (child) {
      return MJMLValidator(child, options);
    })))));
  }

  return _.filter(errors);
}

var unavailableTags = ['mj-html', 'mj-invoice', 'mj-list', 'mj-location'];

var attributesWithUnit = ['background-size', 'border-radius', 'border-width', 'cellpadding', 'cellspacing', 'font-size', 'height', 'icon-height', 'ico-padding', 'ico-padding-bottom', 'ico-font-size', 'ico-line-height', 'ico-padding-left', 'ico-padding-right', 'ico-padding-top', 'icon-size', 'icon-width', 'inner-padding', 'letter-spacing', 'padding', 'padding-bottom', 'padding-left', 'padding-right', 'padding-left', 'tb-border-radius', 'tb-width', 'width'];

var config = {
  unavailableTags: unavailableTags,
  attributesWithUnit: attributesWithUnit
};
var config_1 = config.unavailableTags;
var config_2 = config.attributesWithUnit;

var beautifyOptions = {
  indent_size: 2,
  wrap_attributes_indent_size: 2,
  max_preserve_newline: 0,
  preserve_newlines: false
};

function removeContainerTag(bodyTag) {
  if (bodyTag.children[0].tagName === 'mj-container') {
    bodyTag.attributes = bodyTag.children[0].attributes;
    bodyTag.children = bodyTag.children[0].children;
  }
  return bodyTag;
}

var listAttributes = function listAttributes(tag) {
  return tag.attributes;
};

function addPx(value) {
  if (!isNaN(value) && !_.isNil(value)) {
    return value + 'px';
  }
  return value;
}

function fixUnits(attribute, value) {
  var length = config_2.length;
  for (var i = 0; i < length; i += 1) {
    if (config_2[i] === attribute) {
      return addPx(value);
    }
  }
  return value;
}

function cleanAttributes(attributes) {
  _.keys(attributes).forEach(function (key) {
    attributes[key] = fixUnits(key, attributes[key]);
  });
  return attributes;
}

var DEFAULT_SOCIAL_DISPLAY = 'facebook twitter google';

function migrateSocialSyntax(socialTag) {
  var listAllNetworks = function listAllNetworks(tag) {
    var attributes = (tag.attributes.display || DEFAULT_SOCIAL_DISPLAY).split(' ');
    delete tag.attributes.display;
    return attributes;
  };

  var attributes = listAttributes(socialTag);
  var networks = listAllNetworks(socialTag);

  socialTag.children = [];

  // migrate all attributes to their child attributes
  _.keys(networks).forEach(function (network) {
    var nameMigrated = networks[network].replace(':url', '-noshare').replace(':share', '');
    var nameWithoutOpts = nameMigrated.replace('-noshare', '');

    socialTag.children.push({
      tagName: 'mj-social-element',
      attributes: { name: nameMigrated },
      content: attributes[nameWithoutOpts + '-content'] || ''
    });

    _.keys(attributes).forEach(function (attribute) {
      if (attribute.match(nameWithoutOpts) && !attribute.match('content')) {
        socialTag.children[network].attributes[attribute.replace(nameWithoutOpts + '-', '')] = socialTag.attributes[attribute];
        delete socialTag.attributes[attribute];
      }
    });
  });

  // delete all content attributes from the root tag after they've been migrated
  _.keys(attributes).forEach(function (attribute) {
    if (attribute.match('content')) {
      delete attributes[attribute];
    }
  });

  return socialTag;
}

function migrateNavbarSyntax(navbarTag) {
  navbarTag.tagName = 'mj-section';
  navbarTag.attributes['full-width'] = 'full-width';
  return navbarTag;
}

function migrateHeroSyntax(heroTag) {
  var child = _.find(heroTag.children, { tagName: 'mj-hero-content' });

  return _extends({}, heroTag, {
    children: child.children,
    attributes: _extends({}, heroTag.attributes, child.attributes)
  });
}

function isSupportedTag(tag) {
  return config_1.indexOf(tag) === -1;
}

function loopThrough(tree) {
  _.keys(tree).forEach(function (key) {
    if (key === 'children') {
      for (var i = 0; i < tree.children.length; i += 1) {
        if (isSupportedTag(tree.children[i].tagName)) {
          switch (tree.children[i].tagName) {
            case 'mj-body':
              tree.children[i] = removeContainerTag(tree.children[i]);
              break;
            case 'mj-social':
              tree.children[i] = migrateSocialSyntax(tree.children[i]);
              break;
            case 'mj-navbar':
              tree.children[i] = migrateNavbarSyntax(tree.children[i]);
              break;
            case 'mj-inline-links':
              tree.children[i].tagName = 'mj-navbar';
              break;
            case 'mj-link':
              tree.children[i].tagName = 'mj-navbar-link';
              break;
            case 'mj-hero':
              tree.children[i] = migrateHeroSyntax(tree.children[i]);
              break;
            // no default
          }

          tree.children[i].attributes = cleanAttributes(tree.children[i].attributes);
          loopThrough(tree.children[i]);
        } else {
          console.error('Ignoring unsupported tag : ' + tree.children[i].tagName + ' on line ' + tree.children[i].line);
          delete tree.children[i];
        }
      }
    }
  });
  return tree;
}

function checkV3Through(node) {
  if (node.tagName === 'mj-container') return true;
  if (!node.children || !node.children.length) return false;

  return node.children.some(checkV3Through);
}

var jsonToXML = function jsonToXML(_ref) {
  var tagName = _ref.tagName,
      attributes = _ref.attributes,
      children = _ref.children,
      content = _ref.content;

  var subNode = children && children.length > 0 ? children.map(jsonToXML).join('\n') : content || '';

  var stringAttrs = _Object$keys(attributes).map(function (attr) {
    return attr + '="' + attributes[attr] + '"';
  }).join(' ');

  return '<' + tagName + (stringAttrs === '' ? '>' : ' ' + stringAttrs + '>') + subNode + '</' + tagName + '>';
};

function migrate(input) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var beautify = options.beautify;

  if ((typeof input === 'undefined' ? 'undefined' : _typeof(input)) === 'object') return loopThrough(input);

  var mjmlJson = MJMLParser(input, { components: components, ignoreIncludes: true });
  loopThrough(mjmlJson);

  return beautify ? jsBeautify.html(jsonToXML(mjmlJson), beautifyOptions) : jsonToXML(mjmlJson);
}

function handleMjml3(mjml) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var isV3Synthax = checkV3Through(mjml);
  if (!isV3Synthax) return mjml;

  if (!options.noMigrateWarn) console.log('MJML v3 syntax detected, migrating to MJML v4 syntax. Use mjml -m to get the migrated MJML.');
  return migrate(mjml);
}

/* eslint-enable no-console */

var components = {};

function registerComponent(Component) {
  components[kebabCase(Component.name)] = Component;
}

function initComponent(_ref) {
  var initialDatas = _ref.initialDatas,
      name = _ref.name;

  var Component = components[name];

  if (Component) {
    var component = new Component(initialDatas);

    if (component.headStyle) {
      component.context.addHeadStyle(name, component.headStyle);
    }
    if (component.componentHeadStyle) {
      component.context.addComponentHeadSyle(component.componentHeadStyle);
    }

    return component;
  }

  return null;
}

var suffixCssClasses = (function (classes, suffix) {
    return classes ? classes.split(' ').map(function (c) {
        return c + '-' + suffix;
    }).join(' ') : '';
});

// # OPTIMIZE ME: — check if previous conditionnal is `<!--[if mso | I`]>` too
var mergeOutlookConditionnals = (function (content) {
  return content.replace(/(<!\[endif]-->\s*?<!--\[if mso \| IE]>)/gm, '');
});

var minifyOutlookConditionnals = (function (content) {
  return (
    // find conditionnal comment blocks
    content.replace(/(<!--\[if\s[^\]]+]>)([\s\S]*?)(<!\[endif]-->)/gm, function (match, prefix, content, suffix) {
      // find spaces between tags
      var processedContent = content.replace(/(^|>)(\s+)*(<|$)/gm, function (match, prefix, content, suffix) {
        return '' + prefix + suffix;
      }).replace(/\s{2,}/gm, ' ');
      return '' + prefix + processedContent + suffix;
    })
  );
});

function buildPreview (content) {
  if (content === '') {
    return '';
  }

  return '\n    <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">\n      ' + content + '\n    </div>\n  ';
}

// eslint-disable-next-line import/prefer-default-export
function buildFontsTags(content, inlineStyle) {
  var fonts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var toImport = [];

  forEach(fonts, function (url, name) {
    var regex = new RegExp('"[^"]*font-family:[^"]*' + name + '[^"]*"', 'gmi');
    var inlineRegex = new RegExp('font-family:[^;}]*' + name, 'gmi');

    if (content.match(regex) || inlineStyle.some(function (s) {
      return s.match(inlineRegex);
    })) {
      toImport.push(url);
    }
  });

  if (toImport.length > 0) {
    return '\n      <!--[if !mso]><!-->\n        ' + map$1(toImport, function (url) {
      return '<link href="' + url + '" rel="stylesheet" type="text/css">';
    }).join('\n') + '\n        <style type="text/css">\n          ' + map$1(toImport, function (url) {
      return '@import url(' + url + ');';
    }).join('\n') + '\n        </style>\n      <!--<![endif]-->\n\n    ';
  }

  return '';
}

// eslint-disable-next-line import/prefer-default-export
function buildMediaQueriesTags(breakpoint) {
  var mediaQueries = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var forceOWADesktop = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  if (_.isEmpty(mediaQueries)) {
    return '';
  }

  var baseMediaQueries = _.map(mediaQueries, function (mediaQuery, className) {
    return '.' + className + ' ' + mediaQuery;
  });
  var owaQueries = _.map(baseMediaQueries, function (mq) {
    return '[owa] ' + mq;
  });

  return '\n    <style type="text/css">\n      @media only screen and (min-width:' + breakpoint + ') {\n        ' + baseMediaQueries.join('\n') + '\n      }\n    </style>\n    ' + (forceOWADesktop ? '<style type="text/css">\n' + owaQueries.join('\n') + '\n</style>' : '') + '\n  ';
}

function skeleton(options) {
  var _options$backgroundCo = options.backgroundColor,
      backgroundColor = _options$backgroundCo === undefined ? '' : _options$backgroundCo,
      _options$breakpoint = options.breakpoint,
      breakpoint = _options$breakpoint === undefined ? '480px' : _options$breakpoint,
      _options$content = options.content,
      content = _options$content === undefined ? '' : _options$content,
      _options$fonts = options.fonts,
      fonts = _options$fonts === undefined ? {} : _options$fonts,
      _options$mediaQueries = options.mediaQueries,
      mediaQueries = _options$mediaQueries === undefined ? {} : _options$mediaQueries,
      _options$headStyle = options.headStyle,
      headStyle = _options$headStyle === undefined ? [] : _options$headStyle,
      _options$componentsHe = options.componentsHeadStyle,
      componentsHeadStyle = _options$componentsHe === undefined ? {} : _options$componentsHe,
      _options$headRaw = options.headRaw,
      headRaw = _options$headRaw === undefined ? [] : _options$headRaw,
      preview = options.preview,
      _options$title = options.title,
      title = _options$title === undefined ? '' : _options$title,
      style = options.style,
      forceOWADesktop = options.forceOWADesktop,
      inlineStyle = options.inlineStyle,
      lang = options.lang;


  var langAttribute = lang ? 'lang="' + lang + '" ' : '';

  return '\n    <!doctype html>\n    <html ' + langAttribute + 'xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">\n      <head>\n        <title>\n          ' + title + '\n        </title>\n        <!--[if !mso]><!-- -->\n        <meta http-equiv="X-UA-Compatible" content="IE=edge">\n        <!--<![endif]-->\n        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">\n        <meta name="viewport" content="width=device-width, initial-scale=1">\n        <style type="text/css">\n          #outlook a { padding:0; }\n          body { margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%; }\n          table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }\n          img { border:0;height:auto;line-height:100%; outline:none;text-decoration:none;-ms-interpolation-mode:bicubic; }\n          p { display:block;margin:13px 0; }\n        </style>\n        <!--[if mso]>\n        <xml>\n        <o:OfficeDocumentSettings>\n          <o:AllowPNG/>\n          <o:PixelsPerInch>96</o:PixelsPerInch>\n        </o:OfficeDocumentSettings>\n        </xml>\n        <![endif]-->\n        <!--[if lte mso 11]>\n        <style type="text/css">\n          .outlook-group-fix { width:100% !important; }\n        </style>\n        <![endif]-->\n        ' + buildFontsTags(content, inlineStyle, fonts) + '\n        ' + buildMediaQueriesTags(breakpoint, mediaQueries, forceOWADesktop) + '\n        <style type="text/css">\n        ' + _.reduce(componentsHeadStyle, function (result, compHeadStyle) {
    return result + '\n' + compHeadStyle(breakpoint);
  }, '') + '\n        ' + _.reduce(headStyle, function (result, headStyle) {
    return result + '\n' + headStyle(breakpoint);
  }, '') + '\n        </style>\n        ' + (style && style.length > 0 ? '<style type="text/css">' + style.join('') + '</style>' : '') + '\n        ' + headRaw.filter(_.negate(_.isNil)).join('\n') + '\n      </head>\n      <body' + (backgroundColor === '' ? '' : ' style="background-color:' + backgroundColor + ';"') + '>\n        ' + buildPreview(preview) + '\n        ' + content + '\n      </body>\n    </html>\n  ';
}

var matcher = /^boolean/gim;

var NBoolean = (function () {
  return function (_Type) {
    _inherits(Boolean, _Type);

    function Boolean(boolean) {
      _classCallCheck(this, Boolean);

      var _this = _possibleConstructorReturn(this, (Boolean.__proto__ || _Object$getPrototypeOf(Boolean)).call(this, boolean));

      _this.matchers = [/^true$/i, /^false$/i];
      return _this;
    }

    _createClass(Boolean, [{
      key: 'isValid',
      value: function isValid() {
        return this.value === true || this.value === false;
      }
    }]);

    return Boolean;
  }(Type);
});

var colors = ['aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black', 'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse', 'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki', 'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen', 'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'greenyellow', 'grey', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender', 'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan', 'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey', 'lightsteelblue', 'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine', 'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue', 'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream', 'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange', 'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple', 'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell', 'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen', 'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'transparent', 'turquoise', 'violet', 'wheat', 'white', 'whitesmoke', 'yellow', 'yellowgreen'];

var matcher$1 = /^color/gim;

var shorthandRegex = /^#\w{3}$/;
var replaceInputRegex = /^#(\w)(\w)(\w)$/;
var replaceOutput = '#$1$1$2$2$3$3';

var Color = (function () {
  return function (_Type) {
    _inherits(Color, _Type);

    function Color(color) {
      _classCallCheck(this, Color);

      var _this = _possibleConstructorReturn(this, (Color.__proto__ || _Object$getPrototypeOf(Color)).call(this, color));

      _this.matchers = [/rgba\(\d{1,3},\s?\d{1,3},\s?\d{1,3},\s?\d(\.\d{1,3})?\)/gi, /rgb\(\d{1,3},\s?\d{1,3},\s?\d{1,3}\)/gi, /^#([0-9a-f]{3}){1,2}$/gi, new RegExp('^(' + colors.join('|') + ')$')];
      return _this;
    }

    _createClass(Color, [{
      key: 'getValue',
      value: function getValue() {
        if (this.value.match(shorthandRegex)) {
          return this.value.replace(replaceInputRegex, replaceOutput);
        }

        return this.value;
      }
    }]);

    return Color;
  }(Type);
});

var matcher$2 = /^enum/gim;

var Enum = (function (params) {
  var _class, _temp;

  var matchers = params.match(/\(([^)]+)\)/)[1].split(',');

  return _temp = _class = function (_Type) {
    _inherits(Enum, _Type);

    function Enum(value) {
      _classCallCheck(this, Enum);

      var _this = _possibleConstructorReturn(this, (Enum.__proto__ || _Object$getPrototypeOf(Enum)).call(this, value));

      _this.matchers = matchers.map(function (m) {
        return new RegExp('^' + escapeRegExp(m) + '$');
      });
      return _this;
    }

    return Enum;
  }(Type), _class.errorMessage = 'has invalid value: $value for type Enum, only accepts ' + matchers.join(', '), _temp;
});

var matcher$3 = /^unit\(.*\)/gim;

var Unit = (function (params) {
  var _class, _temp;

  var units = params.match(/\(([^)]+)\)/)[1].split(',');
  var argsMatch = params.match(/\{([^}]+)\}/);
  var args = argsMatch && argsMatch[1] && argsMatch[1].split(',') || ['1']; // defaults to 1

  var allowAuto = units.includes('auto') ? '|auto' : '';
  var filteredUnits = units.filter(function (u) {
    return u !== 'auto';
  });

  return _temp = _class = function (_Type) {
    _inherits(Unit, _Type);

    function Unit(value) {
      _classCallCheck(this, Unit);

      var _this = _possibleConstructorReturn(this, (Unit.__proto__ || _Object$getPrototypeOf(Unit)).call(this, value));

      _this.matchers = [new RegExp('^(((\\d|,|\\.){1,}(' + filteredUnits.map(escapeRegExp).join('|') + ')|0' + allowAuto + ')( )?){' + args.join(',') + '}$')];
      return _this;
    }

    return Unit;
  }(Type), _class.errorMessage = 'has invalid value: $value for type Unit, only accepts (' + units.join(', ') + ') units and ' + args.join(' to ') + ' value(s)', _temp;
});

var matcher$4 = /^string/gim;

var NString = (function () {
  return function (_Type) {
    _inherits(NString, _Type);

    function NString(value) {
      _classCallCheck(this, NString);

      var _this = _possibleConstructorReturn(this, (NString.__proto__ || _Object$getPrototypeOf(NString)).call(this, value));

      _this.matchers = [/.*/];
      return _this;
    }

    return NString;
  }(Type);
});

var matcher$5 = /^integer/gim;

var NInteger = (function () {
  return function (_Type) {
    _inherits(NInteger, _Type);

    function NInteger(value) {
      _classCallCheck(this, NInteger);

      var _this = _possibleConstructorReturn(this, (NInteger.__proto__ || _Object$getPrototypeOf(NInteger)).call(this, value));

      _this.matchers = [/\d+/];
      return _this;
    }

    return NInteger;
  }(Type);
});

var typesConstructors = {
  boolean: { matcher: matcher, typeConstructor: NBoolean },
  enum: { matcher: matcher$2, typeConstructor: Enum },
  color: { matcher: matcher$1, typeConstructor: Color },
  unit: { matcher: matcher$3, typeConstructor: Unit },
  string: { matcher: matcher$4, typeConstructor: NString },
  integer: { matcher: matcher$5, typeConstructor: NInteger }
};

// Avoid recreate existing types
var types = {};

var initializeType = function initializeType(typeConfig) {
  if (types[typeConfig]) {
    return types[typeConfig];
  }

  var _ref = find(typesConstructors, function (type) {
    return !!typeConfig.match(type.matcher);
  }) || {},
      typeConstructor = _ref.typeConstructor;

  if (!typeConstructor) {
    throw new Error('No type found for ' + typeConfig);
  }

  types[typeConfig] = typeConstructor(typeConfig);

  return types[typeConfig];
};

var Type = function () {
  function Type(value) {
    _classCallCheck(this, Type);

    this.value = value;
  }

  _createClass(Type, [{
    key: 'isValid',
    value: function isValid() {
      var _this = this;

      return some(this.matchers, function (matcher) {
        return ('' + _this.value).match(matcher);
      });
    }
  }, {
    key: 'getErrorMessage',
    value: function getErrorMessage() {
      if (this.isValid()) {
        return;
      }

      var errorMessage = this.constructor.errorMessage || 'has invalid value: ' + this.value + ' for type ' + this.constructor.name + ' ';

      return errorMessage.replace(/\$value/g, this.value);
    }
  }, {
    key: 'getValue',
    value: function getValue() {
      return this.value;
    }
  }], [{
    key: 'check',
    value: function check(type) {
      return !!type.match(this.constructor.typeChecker);
    }
  }]);

  return Type;
}();

function handleMjmlConfig() {
  var result = {
    success: [],
    failures: []
  };

  return result;
}

function shorthandParser (cssValue, direction) {
  var splittedCssValue = cssValue.split(' ');
  var directions = {};

  switch (splittedCssValue.length) {
    case 2:
      directions = { top: 0, bottom: 0, left: 1, right: 1 };
      break;

    case 3:
      directions = { top: 0, left: 1, right: 1, bottom: 2 };
      break;

    case 4:
      directions = { top: 0, right: 1, bottom: 2, left: 3 };
      break;
    case 1:
    default:
      return parseInt(cssValue, 10);
  }

  return parseInt(splittedCssValue[directions[direction]] || 0, 10);
}

function borderParser(border) {
  return parseInt(_.get(border.match(/(?:(?:^| )(\d+))/), 1), 10) || 0;
}

var formatAttributes = (function (attributes, allowedAttributes) {
  return _.reduce(attributes, function (acc, val, attrName) {
    if (allowedAttributes && allowedAttributes[attrName]) {
      var TypeConstructor = initializeType(allowedAttributes[attrName]);

      if (TypeConstructor) {
        var type = new TypeConstructor(val);

        return _extends({}, acc, _defineProperty({}, attrName, type.getValue()));
      }
    }

    return _extends({}, acc, _defineProperty({}, attrName, val));
  }, {});
});

var jsonToXML$1 = function jsonToXML(_ref) {
  var tagName = _ref.tagName,
      attributes = _ref.attributes,
      children = _ref.children,
      content = _ref.content;

  var subNode = children && children.length > 0 ? children.map(jsonToXML).join('\n') : content || '';

  var stringAttrs = _Object$keys(attributes).map(function (attr) {
    return attr + '="' + attributes[attr] + '"';
  }).join(' ');

  return '<' + tagName + (stringAttrs === '' ? '>' : ' ' + stringAttrs + '>') + subNode + '</' + tagName + '>';
};

var _class, _temp;

var Component = (_temp = _class = function () {
  _createClass(Component, null, [{
    key: 'getTagName',
    value: function getTagName() {
      return _.kebabCase(this.name);
    }
  }, {
    key: 'isRawElement',
    value: function isRawElement() {
      return !!this.rawElement;
    }
  }]);

  function Component() {
    var initialDatas = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, Component);

    var _initialDatas$attribu = initialDatas.attributes,
        attributes = _initialDatas$attribu === undefined ? {} : _initialDatas$attribu,
        _initialDatas$childre = initialDatas.children,
        children = _initialDatas$childre === undefined ? [] : _initialDatas$childre,
        _initialDatas$content = initialDatas.content,
        content = _initialDatas$content === undefined ? '' : _initialDatas$content,
        _initialDatas$context = initialDatas.context,
        context = _initialDatas$context === undefined ? {} : _initialDatas$context,
        _initialDatas$props = initialDatas.props,
        props = _initialDatas$props === undefined ? {} : _initialDatas$props,
        _initialDatas$globalA = initialDatas.globalAttributes,
        globalAttributes = _initialDatas$globalA === undefined ? {} : _initialDatas$globalA;


    this.props = _extends({}, props, {
      children: children,
      content: content
    });

    this.attributes = formatAttributes(_extends({}, this.constructor.defaultAttributes, globalAttributes, attributes), this.constructor.allowedAttributes);
    this.context = context;

    return this;
  }

  _createClass(Component, [{
    key: 'getChildContext',
    value: function getChildContext() {
      return this.context;
    }
  }, {
    key: 'getAttribute',
    value: function getAttribute(name) {
      return this.attributes[name];
    }
  }, {
    key: 'getContent',
    value: function getContent() {
      return this.props.content.trim();
    }
  }, {
    key: 'renderMJML',
    value: function renderMJML(mjml) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (typeof mjml === 'string') {
        mjml = MJMLParser(mjml, _extends({}, options, {
          components: components,
          ignoreIncludes: true
        }));
      }

      return this.context.processing(mjml, this.context);
    }
  }]);

  return Component;
}(), _class.defaultAttributes = {}, _temp);

var BodyComponent = function (_Component) {
  _inherits(BodyComponent, _Component);

  function BodyComponent() {
    _classCallCheck(this, BodyComponent);

    return _possibleConstructorReturn(this, (BodyComponent.__proto__ || _Object$getPrototypeOf(BodyComponent)).apply(this, arguments));
  }

  _createClass(BodyComponent, [{
    key: 'getStyles',

    // eslint-disable-next-line class-methods-use-this
    value: function getStyles() {
      return {};
    }
  }, {
    key: 'getShorthandAttrValue',
    value: function getShorthandAttrValue(attribute, direction) {
      var mjAttributeDirection = this.getAttribute(attribute + '-' + direction);
      var mjAttribute = this.getAttribute(attribute);

      if (mjAttributeDirection) {
        return parseInt(mjAttributeDirection, 10);
      }

      if (!mjAttribute) {
        return 0;
      }

      return shorthandParser(mjAttribute, direction);
    }
  }, {
    key: 'getShorthandBorderValue',
    value: function getShorthandBorderValue(direction) {
      var borderDirection = direction && this.getAttribute('border-' + direction);
      var border = this.getAttribute('border');

      return borderParser(borderDirection || border || '0');
    }
  }, {
    key: 'getBoxWidths',
    value: function getBoxWidths() {
      var containerWidth = this.context.containerWidth;

      var parsedWidth = parseInt(containerWidth, 10);

      var paddings = this.getShorthandAttrValue('padding', 'right') + this.getShorthandAttrValue('padding', 'left');

      var borders = this.getShorthandBorderValue('right') + this.getShorthandBorderValue('left');

      return {
        totalWidth: parsedWidth,
        borders: borders,
        paddings: paddings,
        box: parsedWidth - paddings - borders
      };
    }
  }, {
    key: 'htmlAttributes',
    value: function htmlAttributes(attributes) {
      var _this2 = this;

      var specialAttributes = {
        style: function style(v) {
          return _this2.styles(v);
        },
        default: _.identity
      };

      return _.reduce(attributes, function (output, v, name) {
        var value = (specialAttributes[name] || specialAttributes.default)(v);

        if (!_.isNil(value)) {
          return output + ' ' + name + '="' + value + '"';
        }

        return output;
      }, '');
    }
  }, {
    key: 'styles',
    value: function styles(_styles) {
      var stylesObject = void 0;

      if (_styles) {
        if (typeof _styles === 'string') {
          stylesObject = _.get(this.getStyles(), _styles);
        } else {
          stylesObject = _styles;
        }
      }

      return _.reduce(stylesObject, function (output, value, name) {
        if (!_.isNil(value)) {
          return '' + output + name + ':' + value + ';';
        }
        return output;
      }, '');
    }
  }, {
    key: 'renderChildren',
    value: function renderChildren(childrens) {
      var _this3 = this;

      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var _options$props = options.props,
          props = _options$props === undefined ? {} : _options$props,
          _options$renderer = options.renderer,
          renderer = _options$renderer === undefined ? function (component) {
        return component.render();
      } : _options$renderer,
          _options$attributes = options.attributes,
          attributes = _options$attributes === undefined ? {} : _options$attributes,
          _options$rawXML = options.rawXML,
          rawXML = _options$rawXML === undefined ? false : _options$rawXML;


      childrens = childrens || this.props.children;

      if (rawXML) {
        return childrens.map(function (child) {
          return jsonToXML$1(child);
        }).join('\n');
      }

      var sibling = childrens.length;

      var rawComponents = _.filter(components, function (c) {
        return c.isRawElement();
      });
      var nonRawSiblings = childrens.filter(function (child) {
        return !_.find(rawComponents, function (c) {
          return c.getTagName() === child.tagName;
        });
      }).length;

      var output = '';
      var index = 0;

      _.forEach(childrens, function (children) {
        var component = initComponent({
          name: children.tagName,
          initialDatas: _extends({}, children, {
            attributes: _extends({}, attributes, children.attributes),
            context: _this3.getChildContext(),
            props: _extends({}, props, {
              first: index === 0,
              index: index,
              last: index + 1 === sibling,
              sibling: sibling,
              nonRawSiblings: nonRawSiblings
            })
          })
        });

        if (component !== null) {
          output += renderer(component);
        }

        index++; // eslint-disable-line no-plusplus
      });

      return output;
    }
  }]);

  return BodyComponent;
}(Component);


var HeadComponent = function (_Component2) {
  _inherits(HeadComponent, _Component2);

  function HeadComponent() {
    _classCallCheck(this, HeadComponent);

    return _possibleConstructorReturn(this, (HeadComponent.__proto__ || _Object$getPrototypeOf(HeadComponent)).apply(this, arguments));
  }

  _createClass(HeadComponent, [{
    key: 'handlerChildren',
    value: function handlerChildren() {
      var _this5 = this;

      var childrens = this.props.children;

      return childrens.map(function (children) {
        var component = initComponent({
          name: children.tagName,
          initialDatas: _extends({}, children, {
            context: _this5.getChildContext()
          })
        });

        if (!component) {
          // eslint-disable-next-line no-console
          console.error('No matching component for tag : ' + children.tagName);
          return null;
        }

        if (component.handler) {
          component.handler();
        }

        if (component.render) {
          return component.render();
        }
        return null;
      });
    }
  }], [{
    key: 'getTagName',
    value: function getTagName() {
      return _.kebabCase(this.name);
    }
  }]);

  return HeadComponent;
}(Component);

var ValidationError = function (_Error) {
  _inherits(ValidationError, _Error);

  function ValidationError(message, errors) {
    _classCallCheck(this, ValidationError);

    var _this = _possibleConstructorReturn(this, (ValidationError.__proto__ || _Object$getPrototypeOf(ValidationError)).call(this, message));

    _this.errors = errors;
    return _this;
  }

  return ValidationError;
}(Error);

function mjml2html(mjml) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var content = '';
  var errors = [];

  var _options$beautify = options.beautify,
      beautify = _options$beautify === undefined ? false : _options$beautify,
      _options$fonts = options.fonts,
      fonts = _options$fonts === undefined ? {
    'Open Sans': 'https://fonts.googleapis.com/css?family=Open+Sans:300,400,500,700',
    'Droid Sans': 'https://fonts.googleapis.com/css?family=Droid+Sans:300,400,500,700',
    Lato: 'https://fonts.googleapis.com/css?family=Lato:300,400,500,700',
    Roboto: 'https://fonts.googleapis.com/css?family=Roboto:300,400,500,700',
    Ubuntu: 'https://fonts.googleapis.com/css?family=Ubuntu:300,400,500,700'
  } : _options$fonts,
      keepComments = options.keepComments,
      _options$minify = options.minify,
      minify = _options$minify === undefined ? false : _options$minify,
      _options$minifyOption = options.minifyOptions,
      _options$juiceOptions = options.juiceOptions,
      juiceOptions = _options$juiceOptions === undefined ? {} : _options$juiceOptions,
      _options$juicePreserv = options.juicePreserveTags,
      juicePreserveTags = _options$juicePreserv === undefined ? null : _options$juicePreserv,
      _options$skeleton = options.skeleton,
      skeleton$1 = _options$skeleton === undefined ? skeleton : _options$skeleton,
      _options$validationLe = options.validationLevel,
      validationLevel = _options$validationLe === undefined ? 'soft' : _options$validationLe,
      _options$filePath = options.filePath,
      filePath = _options$filePath === undefined ? '.' : _options$filePath,
      _options$mjmlConfigPa = options.mjmlConfigPath,
      _options$noMigrateWar = options.noMigrateWarn,
      noMigrateWarn = _options$noMigrateWar === undefined ? false : _options$noMigrateWar;

  if (typeof mjml === 'string') {
    mjml = MJMLParser(mjml, {
      keepComments: keepComments,
      components: components,
      filePath: filePath
    });
  }

  mjml = handleMjml3(mjml, { noMigrateWarn: noMigrateWarn });

  var globalDatas = {
    backgroundColor: '',
    breakpoint: '480px',
    classes: {},
    classesDefault: {},
    defaultAttributes: {},
    fonts: fonts,
    inlineStyle: [],
    headStyle: {},
    componentsHeadStyle: [],
    headRaw: [],
    mediaQueries: {},
    preview: '',
    style: [],
    title: '',
    forceOWADesktop: _.get(mjml, 'attributes.owa', 'mobile') === 'desktop',
    lang: _.get(mjml, 'attributes.lang')
  };

  var validatorOptions = {
    components: components,
    initializeType: initializeType
  };

  switch (validationLevel) {
    case 'skip':
      break;

    case 'strict':
      errors = MJMLValidator(mjml, validatorOptions);

      if (errors.length > 0) {
        throw new ValidationError('ValidationError: \n ' + errors.map(function (e) {
          return e.formattedMessage;
        }).join('\n'), errors);
      }
      break;

    case 'soft':
    default:
      errors = MJMLValidator(mjml, validatorOptions);
      break;
  }

  var mjBody = _.find(mjml.children, { tagName: 'mj-body' });
  var mjHead = _.find(mjml.children, { tagName: 'mj-head' });

  var _processing = function _processing(node, context) {
    var parseMJML = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _.identity;

    if (!node) {
      return;
    }

    var component = initComponent({
      name: node.tagName,
      initialDatas: _extends({}, parseMJML(node), {
        context: context
      })
    });

    if (component !== null) {
      if ('handler' in component) {
        return component.handler(); // eslint-disable-line consistent-return
      }

      if ('render' in component) {
        return component.render(); // eslint-disable-line consistent-return
      }
    }
  };

  var applyAttributes = function applyAttributes(mjml) {
    var parse = function parse(mjml) {
      var parentMjClass = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      var attributes = mjml.attributes,
          tagName = mjml.tagName,
          children = mjml.children;

      var classes = _.get(mjml.attributes, 'mj-class', '').split(' ');
      var attributesClasses = _.reduce(classes, function (acc, value) {
        var mjClassValues = globalDatas.classes[value];
        var multipleClasses = {};
        if (acc['css-class'] && _.get(mjClassValues, 'css-class')) {
          multipleClasses = {
            'css-class': acc['css-class'] + ' ' + mjClassValues['css-class']
          };
        }

        return _extends({}, acc, mjClassValues, multipleClasses);
      }, {});

      var defaultAttributesForClasses = _.reduce(parentMjClass.split(' '), function (acc, value) {
        return _extends({}, acc, _.get(globalDatas.classesDefault, value + '.' + tagName));
      }, {});
      var nextParentMjClass = _.get(attributes, 'mj-class', parentMjClass);

      return _extends({}, mjml, {
        attributes: _extends({}, globalDatas.defaultAttributes[tagName], attributesClasses, defaultAttributesForClasses, _.omit(attributes, ['mj-class'])),
        globalAttributes: _extends({}, globalDatas.defaultAttributes['mj-all']),
        children: _.map(children, function (mjml) {
          return parse(mjml, nextParentMjClass);
        })
      });
    };

    return parse(mjml);
  };

  var bodyHelpers = {
    addMediaQuery: function addMediaQuery(className, _ref) {
      var parsedWidth = _ref.parsedWidth,
          unit = _ref.unit;

      globalDatas.mediaQueries[className] = '{ width:' + parsedWidth + unit + ' !important; max-width: ' + parsedWidth + unit + '; }';
    },
    addHeadStyle: function addHeadStyle(identifier, headStyle) {
      globalDatas.headStyle[identifier] = headStyle;
    },
    addComponentHeadSyle: function addComponentHeadSyle(headStyle) {
      globalDatas.componentsHeadStyle.push(headStyle);
    },

    setBackgroundColor: function setBackgroundColor(color) {
      globalDatas.backgroundColor = color;
    },
    processing: function processing(node, context) {
      return _processing(node, context, applyAttributes);
    }
  };

  var headHelpers = {
    add: function add(attr) {
      for (var _len = arguments.length, params = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        params[_key - 1] = arguments[_key];
      }

      if (Array.isArray(globalDatas[attr])) {
        var _globalDatas$attr;

        (_globalDatas$attr = globalDatas[attr]).push.apply(_globalDatas$attr, _toConsumableArray(params));
      } else if (Object.prototype.hasOwnProperty.call(globalDatas, attr)) {
        if (params.length > 1) {
          if (_.isObject(globalDatas[attr][params[0]])) {
            globalDatas[attr][params[0]] = _extends({}, globalDatas[attr][params[0]], params[1]);
          } else {
            globalDatas[attr][params[0]] = params[1];
          }
        } else {
          globalDatas[attr] = params[0];
        }
      } else {
        throw Error('An mj-head element add an unkown head attribute : ' + attr + ' with params ' + (Array.isArray(params) ? params.join('') : params));
      }
    }
  };

  globalDatas.headRaw = _processing(mjHead, headHelpers);

  content = _processing(mjBody, bodyHelpers, applyAttributes);

  if (minify && minify !== 'false') {
    content = minifyOutlookConditionnals(content);
  }

  content = skeleton$1(_extends({
    content: content
  }, globalDatas));

  if (globalDatas.inlineStyle.length > 0) {
    if (juicePreserveTags) {
      _.each(juicePreserveTags, function (val, key) {
        juice.codeBlocks[key] = val;
      });
    }

    content = juice(content, _extends({
      applyStyleTags: false,
      extraCss: globalDatas.inlineStyle.join(''),
      insertPreservedExtraCss: false,
      removeStyleTags: false
    }, juiceOptions));
  }

  content = beautify && beautify !== 'false' ? jsBeautify.html(content, {
    indent_size: 2,
    wrap_attributes_indent_size: 2,
    max_preserve_newline: 0,
    preserve_newlines: false
  }) : content;

  content = mergeOutlookConditionnals(content);

  return {
    html: content,
    errors: errors
  };
}

handleMjmlConfig(process.cwd());

var _class$1, _temp$1;

var MjSocial = (_temp$1 = _class$1 = function (_BodyComponent) {
  _inherits(MjSocial, _BodyComponent);

  function MjSocial() {
    _classCallCheck(this, MjSocial);

    return _possibleConstructorReturn(this, (MjSocial.__proto__ || _Object$getPrototypeOf(MjSocial)).apply(this, arguments));
  }

  _createClass(MjSocial, [{
    key: 'getStyles',
    value: function getStyles() {
      // eslint-disable-line class-methods-use-this
      return {
        tableVertical: {
          margin: '0px'
        }
      };
    }
  }, {
    key: 'getSocialElementAttributes',
    value: function getSocialElementAttributes() {
      var _this2 = this;

      var base = {};
      if (this.getAttribute('inner-padding')) {
        base.padding = this.getAttribute('inner-padding');
      }

      return ['border-radius', 'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'icon-size', 'icon-height', 'icon-padding', 'text-padding', 'line-height', 'text-decoration'].reduce(function (res, attr) {
        res[attr] = _this2.getAttribute(attr);
        return res;
      }, base);
    }
  }, {
    key: 'renderHorizontal',
    value: function renderHorizontal() {
      var _this3 = this;

      var children = this.props.children;


      return '\n     <!--[if mso | IE]>\n      <table\n        ' + this.htmlAttributes({
        align: this.getAttribute('align'),
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation'
      }) + '\n      >\n        <tr>\n      <![endif]-->\n      ' + this.renderChildren(children, {
        attributes: this.getSocialElementAttributes(),
        renderer: function renderer(component) {
          return '\n            <!--[if mso | IE]>\n              <td>\n            <![endif]-->\n              <table\n                ' + component.htmlAttributes({
            align: _this3.getAttribute('align'),
            border: '0',
            cellpadding: '0',
            cellspacing: '0',
            role: 'presentation',
            style: {
              float: 'none',
              display: 'inline-table'
            }
          }) + '\n              >\n                ' + component.render() + '\n              </table>\n            <!--[if mso | IE]>\n              </td>\n            <![endif]-->\n          ';
        }
      }) + '\n      <!--[if mso | IE]>\n          </tr>\n        </table>\n      <![endif]-->\n    ';
    }
  }, {
    key: 'renderVertical',
    value: function renderVertical() {
      var children = this.props.children;


      return '\n      <table\n        ' + this.htmlAttributes({
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation',
        style: 'tableVertical'
      }) + '\n      >\n        ' + this.renderChildren(children, {
        attributes: this.getSocialElementAttributes()
      }) + '\n      </table>\n    ';
    }
  }, {
    key: 'render',
    value: function render() {
      return '\n      ' + (this.getAttribute('mode') === 'horizontal' ? this.renderHorizontal() : this.renderVertical()) + '\n    ';
    }
  }]);

  return MjSocial;
}(BodyComponent), _class$1.allowedAttributes = {
  align: 'enum(left,right,center)',
  'border-radius': 'unit(px)',
  'container-background-color': 'color',
  color: 'color',
  'font-family': 'string',
  'font-size': 'unit(px)',
  'font-style': 'string',
  'font-weight': 'string',
  'icon-size': 'unit(px,%)',
  'icon-height': 'unit(px,%)',
  'icon-padding': 'unit(px,%){1,4}',
  'inner-padding': 'unit(px,%){1,4}',
  'line-height': 'unit(px,%,)',
  mode: 'enum(horizontal,vertical)',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  padding: 'unit(px,%){1,4}',
  'table-layout': 'enum(auto,fixed)',
  'text-padding': 'unit(px,%){1,4}',
  'text-decoration': 'string',
  'vertical-align': 'enum(top,bottom,middle)'
}, _class$1.defaultAttributes = {
  align: 'center',
  'border-radius': '3px',
  color: '#333333',
  'font-family': 'Ubuntu, Helvetica, Arial, sans-serif',
  'font-size': '13px',
  'icon-size': '20px',
  'inner-padding': null,
  'line-height': '22px',
  mode: 'horizontal',
  padding: '10px 25px',
  'text-decoration': 'none'
}, _temp$1);

var _class$2, _temp$2;

var IMG_BASE_URL = 'https://www.mailjet.com/images/theme/v1/icons/ico-social/';

var defaultSocialNetworks = {
  facebook: {
    'share-url': 'https://www.facebook.com/sharer/sharer.php?u=[[URL]]',
    'background-color': '#3b5998',
    src: IMG_BASE_URL + 'facebook.png'
  },
  twitter: {
    'share-url': 'https://twitter.com/home?status=[[URL]]',
    'background-color': '#55acee',
    src: IMG_BASE_URL + 'twitter.png'
  },
  google: {
    'share-url': 'https://plus.google.com/share?url=[[URL]]',
    'background-color': '#dc4e41',
    src: IMG_BASE_URL + 'google-plus.png'
  },
  pinterest: {
    'share-url': 'https://pinterest.com/pin/create/button/?url=[[URL]]&media=&description=',
    'background-color': '#bd081c',
    src: IMG_BASE_URL + 'pinterest.png'
  },
  linkedin: {
    'share-url': 'https://www.linkedin.com/shareArticle?mini=true&url=[[URL]]&title=&summary=&source=',
    'background-color': '#0077b5',
    src: IMG_BASE_URL + 'linkedin.png'
  },
  instagram: {
    'background-color': '#3f729b',
    src: IMG_BASE_URL + 'instagram.png'
  },
  web: {
    src: IMG_BASE_URL + 'web.png',
    'background-color': '#4BADE9'
  },
  snapchat: {
    src: IMG_BASE_URL + 'snapchat.png',
    'background-color': '#FFFA54'
  },
  youtube: {
    src: IMG_BASE_URL + 'youtube.png',
    'background-color': '#EB3323'
  },
  tumblr: {
    src: IMG_BASE_URL + 'tumblr.png',
    'share-url': 'https://www.tumblr.com/widgets/share/tool?canonicalUrl=[[URL]]',
    'background-color': '#344356'
  },
  github: {
    src: IMG_BASE_URL + 'github.png',
    'background-color': '#000000'
  },
  xing: {
    src: IMG_BASE_URL + 'xing.png',
    'share-url': 'https://www.xing.com/app/user?op=share&url=[[URL]]',
    'background-color': '#296366'
  },
  vimeo: {
    src: IMG_BASE_URL + 'vimeo.png',
    'background-color': '#53B4E7'
  },
  medium: {
    src: IMG_BASE_URL + 'medium.png',
    'background-color': '#000000'
  },
  soundcloud: {
    src: IMG_BASE_URL + 'soundcloud.png',
    'background-color': '#EF7F31'
  },
  dribbble: {
    src: IMG_BASE_URL + 'dribbble.png',
    'background-color': '#D95988'
  }
};

_.each(defaultSocialNetworks, function (val, key) {
  defaultSocialNetworks[key + '-noshare'] = _extends({}, val, {
    'share-url': '[[URL]]'
  });
});

var MjSocialElement = (_temp$2 = _class$2 = function (_BodyComponent) {
  _inherits(MjSocialElement, _BodyComponent);

  function MjSocialElement() {
    _classCallCheck(this, MjSocialElement);

    return _possibleConstructorReturn(this, (MjSocialElement.__proto__ || _Object$getPrototypeOf(MjSocialElement)).apply(this, arguments));
  }

  _createClass(MjSocialElement, [{
    key: 'getStyles',
    value: function getStyles() {
      var _getSocialAttributes = this.getSocialAttributes(),
          iconSize = _getSocialAttributes['icon-size'],
          iconHeight = _getSocialAttributes['icon-height'],
          backgroundColor = _getSocialAttributes['background-color'];

      return {
        td: {
          padding: this.getAttribute('padding')
        },
        table: {
          background: backgroundColor,
          'border-radius': this.getAttribute('border-radius'),
          width: iconSize
        },
        icon: {
          padding: this.getAttribute('icon-padding'),
          'font-size': '0',
          height: iconHeight || iconSize,
          'vertical-align': 'middle',
          width: iconSize
        },
        img: {
          'border-radius': this.getAttribute('border-radius'),
          display: 'block'
        },
        tdText: {
          'vertical-align': 'middle',
          padding: this.getAttribute('text-padding')

        },
        text: {
          color: this.getAttribute('color'),
          'font-size': this.getAttribute('font-size'),
          'font-weight': this.getAttribute('font-weight'),
          'font-style': this.getAttribute('font-style'),
          'font-family': this.getAttribute('font-family'),
          'line-height': this.getAttribute('line-height'),
          'text-decoration': this.getAttribute('text-decoration')
        }
      };
    }
  }, {
    key: 'getSocialAttributes',
    value: function getSocialAttributes() {
      var _this2 = this;

      var socialNetwork = defaultSocialNetworks[this.getAttribute('name')] || {};
      var href = this.getAttribute('href');

      if (_.get(socialNetwork, 'share-url')) {
        href = socialNetwork['share-url'].replace('[[URL]]', href);
      }

      var attrs = ['icon-size', 'icon-height', 'src', 'background-color'].reduce(function (r, attr) {
        return _extends({}, r, _defineProperty({}, attr, _this2.getAttribute(attr) || socialNetwork[attr]));
      }, {});

      return _extends({
        href: href
      }, attrs);
    }
  }, {
    key: 'render',
    value: function render() {
      var _getSocialAttributes2 = this.getSocialAttributes(),
          src = _getSocialAttributes2.src,
          href = _getSocialAttributes2.href,
          iconSize = _getSocialAttributes2['icon-size'],
          iconHeight = _getSocialAttributes2['icon-height'];

      return '\n      <tr\n        ' + this.htmlAttributes({
        class: this.getAttribute('css-class')
      }) + '\n      >\n        <td ' + this.htmlAttributes({ style: 'td' }) + '>\n          <table\n            ' + this.htmlAttributes({
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation',
        style: 'table'
      }) + '\n          >\n            <tr>\n              <td ' + this.htmlAttributes({ style: 'icon' }) + '>\n                <a ' + this.htmlAttributes({
        href: href,
        rel: this.getAttribute('rel'),
        target: this.getAttribute('target')
      }) + '>\n                    <img\n                      ' + this.htmlAttributes({
        alt: this.getAttribute('alt'),
        title: this.getAttribute('title'),
        height: parseInt(iconHeight || iconSize, 10),
        src: src,
        style: 'img',
        width: parseInt(iconSize, 10)
      }) + '\n                    />\n                  </a>\n                </td>\n              </tr>\n          </table>\n        </td>\n        ' + (this.getContent() ? '\n          <td ' + this.htmlAttributes({ style: 'tdText' }) + '>\n            <a\n              ' + this.htmlAttributes({
        href: href,
        style: 'text',
        rel: this.getAttribute('rel'),
        target: this.getAttribute('target')
      }) + '>\n              ' + this.getContent() + '\n            </a>\n          </td>\n          ' : '') + '\n      </tr>\n    ';
    }
  }]);

  return MjSocialElement;
}(BodyComponent), _class$2.endingTag = true, _class$2.allowedAttributes = {
  align: 'enum(left,center,right)',
  'background-color': 'color',
  color: 'color',
  'border-radius': 'unit(px)',
  'font-family': 'string',
  'font-size': 'unit(px)',
  'font-style': 'string',
  'font-weight': 'string',
  href: 'string',
  'icon-size': 'unit(px,%)',
  'icon-height': 'unit(px,%)',
  'icon-padding': 'unit(px,%){1,4}',
  'line-height': 'unit(px,%,)',
  name: 'string',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  padding: 'unit(px,%){1,4}',
  'text-padding': 'unit(px,%){1,4}',
  src: 'string',
  alt: 'string',
  title: 'string',
  target: 'string',
  'text-decoration': 'string'
}, _class$2.defaultAttributes = {
  align: 'left',
  color: '#000',
  'border-radius': '3px',
  'font-family': 'Ubuntu, Helvetica, Arial, sans-serif',
  'font-size': '13px',
  'line-height': '1',
  padding: '4px',
  'text-padding': '4px 4px 4px 0',
  target: '_blank',
  'text-decoration': 'none',
  href: '[[SHORT_PERMALINK]]'
}, _temp$2);

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var conditionalTag_1 = createCommonjsModule(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = conditionalTag;
exports.msoConditionalTag = msoConditionalTag;
var startConditionalTag = exports.startConditionalTag = '<!--[if mso | IE]>';
var startMsoConditionalTag = exports.startMsoConditionalTag = '<!--[if mso]>';
var endConditionalTag = exports.endConditionalTag = '<![endif]-->';
var startNegationConditionalTag = exports.startNegationConditionalTag = '<!--[if !mso | IE]><!-->';
var startMsoNegationConditionalTag = exports.startMsoNegationConditionalTag = '<!--[if !mso><!-->';
var endNegationConditionalTag = exports.endNegationConditionalTag = '<!--<![endif]-->';

function conditionalTag(content) {
  var negation = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  return '\n    ' + (negation ? startNegationConditionalTag : startConditionalTag) + '\n    ' + content + '\n    ' + (negation ? endNegationConditionalTag : endConditionalTag) + '\n  ';
}

function msoConditionalTag(content) {
  var negation = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  return '\n    ' + (negation ? startMsoNegationConditionalTag : startMsoConditionalTag) + '\n    ' + content + '\n    ' + (negation ? endNegationConditionalTag : endConditionalTag) + '\n  ';
}
});

var conditionalTag = unwrapExports(conditionalTag_1);
var conditionalTag_2 = conditionalTag_1.msoConditionalTag;
var conditionalTag_3 = conditionalTag_1.startConditionalTag;
var conditionalTag_4 = conditionalTag_1.startMsoConditionalTag;
var conditionalTag_5 = conditionalTag_1.endConditionalTag;
var conditionalTag_6 = conditionalTag_1.startNegationConditionalTag;
var conditionalTag_7 = conditionalTag_1.startMsoNegationConditionalTag;
var conditionalTag_8 = conditionalTag_1.endNegationConditionalTag;

var _class$3, _temp2;

var MjNavbar = (_temp2 = _class$3 = function (_BodyComponent) {
  _inherits(MjNavbar, _BodyComponent);

  function MjNavbar() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, MjNavbar);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = MjNavbar.__proto__ || _Object$getPrototypeOf(MjNavbar)).call.apply(_ref, [this].concat(args))), _this), _this.headStyle = function (breakpoint) {
      return '\n      noinput.mj-menu-checkbox { display:block!important; max-height:none!important; visibility:visible!important; }\n\n      @media only screen and (max-width:' + breakpoint + ') {\n        .mj-menu-checkbox[type="checkbox"] ~ .mj-inline-links { display:none!important; }\n        .mj-menu-checkbox[type="checkbox"]:checked ~ .mj-inline-links,\n        .mj-menu-checkbox[type="checkbox"] ~ .mj-menu-trigger { display:block!important; max-width:none!important; max-height:none!important; font-size:inherit!important; }\n        .mj-menu-checkbox[type="checkbox"] ~ .mj-inline-links > a { display:block!important; }\n        .mj-menu-checkbox[type="checkbox"]:checked ~ .mj-menu-trigger .mj-menu-icon-close { display:block!important; }\n        .mj-menu-checkbox[type="checkbox"]:checked ~ .mj-menu-trigger .mj-menu-icon-open { display:none!important; }\n      }\n    ';
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(MjNavbar, [{
    key: 'getStyles',
    value: function getStyles() {
      return {
        div: {
          align: this.getAttribute('align'),
          width: '100%'
        },
        label: {
          display: 'block',
          cursor: 'pointer',
          'mso-hide': 'all',
          '-moz-user-select': 'none',
          'user-select': 'none',
          color: this.getAttribute('ico-color'),
          'font-size': this.getAttribute('ico-font-size'),
          'font-family': this.getAttribute('ico-font-family'),
          'text-transform': this.getAttribute('ico-text-transform'),
          'text-decoration': this.getAttribute('ico-text-decoration'),
          'line-height': this.getAttribute('ico-line-height'),
          'padding-top': this.getAttribute('ico-padding-top'),
          'padding-right': this.getAttribute('ico-padding-right'),
          'padding-bottom': this.getAttribute('ico-padding-bottom'),
          'padding-left': this.getAttribute('ico-padding-left'),
          padding: this.getAttribute('ico-padding')
        },
        trigger: {
          display: 'none',
          'max-height': '0px',
          'max-width': '0px',
          'font-size': '0px',
          overflow: 'hidden'
        },
        icoOpen: {
          'mso-hide': 'all'
        },
        icoClose: {
          display: 'none',
          'mso-hide': 'all'
        }
      };
    }
  }, {
    key: 'renderHamburger',
    value: function renderHamburger() {
      var key = crypto.randomBytes(8).toString('hex');

      return '\n      ' + conditionalTag_2('\n        <input type="checkbox" id="' + key + '" class="mj-menu-checkbox" style="display:none !important; max-height:0; visibility:hidden;" />\n      ', true) + '\n      <div\n        ' + this.htmlAttributes({
        class: 'mj-menu-trigger',
        style: 'trigger'
      }) + '\n      >\n        <label\n          ' + this.htmlAttributes({
        for: key,
        class: 'mj-menu-label',
        style: 'label',
        align: this.getAttribute('ico-align')
      }) + '\n        >\n          <span\n            ' + this.htmlAttributes({
        class: 'mj-menu-icon-open',
        style: 'icoOpen'
      }) + '\n          >\n            ' + this.getAttribute('ico-open') + '\n          </span>\n          <span\n            ' + this.htmlAttributes({
        class: 'mj-menu-icon-close',
        style: 'icoClose'
      }) + '\n          >\n            ' + this.getAttribute('ico-close') + '\n          </span>\n        </label>\n      </div>\n    ';
    }
  }, {
    key: 'render',
    value: function render() {
      return '\n        ' + (this.getAttribute('hamburger') === 'hamburger' ? this.renderHamburger() : '') + '\n        <div\n          ' + this.htmlAttributes({
        class: 'mj-inline-links',
        style: this.htmlAttributes('div')
      }) + '\n        >\n        ' + conditionalTag('\n          <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="' + this.getAttribute('align') + '">\n            <tr>\n        ') + '\n          ' + this.renderChildren(this.props.children, {
        attributes: {
          navbarBaseUrl: this.getAttribute('base-url')
        }
      }) + '\n          ' + conditionalTag('\n            </tr></table>\n          ') + '\n        </div>\n    ';
    }
  }]);

  return MjNavbar;
}(BodyComponent), _class$3.allowedAttributes = {
  align: 'enum(left,center,right)',
  'base-url': 'string',
  hamburger: 'string',
  'ico-align': 'enum(left,center,right)',
  'ico-open': 'string',
  'ico-close': 'string',
  'ico-color': 'color',
  'ico-font-size': 'unit(px,%)',
  'ico-font-family': 'string',
  'ico-text-transform': 'string',
  'ico-padding': 'unit(px,%){1,4}',
  'ico-padding-left': 'unit(px,%)',
  'ico-padding-top': 'unit(px,%)',
  'ico-padding-right': 'unit(px,%)',
  'ico-padding-bottom': 'unit(px,%)',
  'padding': 'unit(px,%){1,4}',
  'padding-left': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-bottom': 'unit(px,%)',
  'ico-text-decoration': 'string',
  'ico-line-height': 'unit(px,%,)'
}, _class$3.defaultAttributes = {
  align: 'center',
  'base-url': null,
  hamburger: null,
  'ico-align': 'center',
  'ico-open': '&#9776;',
  'ico-close': '&#8855;',
  'ico-color': '#000000',
  'ico-font-size': '30px',
  'ico-font-family': 'Ubuntu, Helvetica, Arial, sans-serif',
  'ico-text-transform': 'uppercase',
  'ico-padding': '10px',
  'ico-text-decoration': 'none',
  'ico-line-height': '30px'
}, _temp2);

var _class$4, _temp$3;

var MjNavbarLink = (_temp$3 = _class$4 = function (_BodyComponent) {
  _inherits(MjNavbarLink, _BodyComponent);

  function MjNavbarLink() {
    _classCallCheck(this, MjNavbarLink);

    return _possibleConstructorReturn(this, (MjNavbarLink.__proto__ || _Object$getPrototypeOf(MjNavbarLink)).apply(this, arguments));
  }

  _createClass(MjNavbarLink, [{
    key: 'getStyles',
    value: function getStyles() {
      return {
        a: {
          display: 'inline-block',
          color: this.getAttribute('color'),
          'font-family': this.getAttribute('font-family'),
          'font-size': this.getAttribute('font-size'),
          'font-weight': this.getAttribute('font-weight'),
          'line-height': this.getAttribute('line-height'),
          'text-decoration': this.getAttribute('text-decoration'),
          'text-transform': this.getAttribute('text-transform'),
          padding: this.getAttribute('padding'),
          'padding-top': this.getAttribute('padding-top'),
          'padding-left': this.getAttribute('padding-left'),
          'padding-right': this.getAttribute('padding-right'),
          'padding-bottom': this.getAttribute('padding-bottom')
        },
        td: {
          padding: this.getAttribute('padding'),
          'padding-top': this.getAttribute('padding-top'),
          'padding-left': this.getAttribute('padding-left'),
          'padding-right': this.getAttribute('padding-right'),
          'padding-bottom': this.getAttribute('padding-bottom')
        }
      };
    }
  }, {
    key: 'renderContent',
    value: function renderContent() {
      var href = this.getAttribute('href');
      var navbarBaseUrl = this.getAttribute('navbarBaseUrl');
      var link = navbarBaseUrl ? url.resolve(navbarBaseUrl, href) : href;

      var cssClass = this.getAttribute('css-class') ? ' ' + this.getAttribute('css-class') : '';

      return '\n      <a\n        ' + this.htmlAttributes({
        class: 'mj-link' + cssClass,
        href: link,
        rel: this.getAttribute('rel'),
        target: this.getAttribute('target'),
        name: this.getAttribute('name'),
        style: 'a'
      }) + '\n      >\n        ' + this.getContent() + '\n      </a>\n    ';
    }
  }, {
    key: 'render',
    value: function render() {
      return '\n        ' + conditionalTag('\n          <td\n            ' + this.htmlAttributes({
        style: 'td',
        class: suffixCssClasses(this.getAttribute('css-class'), 'outlook')
      }) + '\n          >\n        ') + '\n        ' + this.renderContent() + '\n        ' + conditionalTag('\n          </td>\n        ') + '\n      ';
    }
  }]);

  return MjNavbarLink;
}(BodyComponent), _class$4.endingTag = true, _class$4.allowedAttributes = {
  color: 'color',
  'font-family': 'string',
  'font-size': 'unit(px)',
  'font-weight': 'string',
  href: 'string',
  name: 'string',
  target: 'string',
  rel: 'string',
  'line-height': 'unit(px,%,)',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  padding: 'unit(px,%){1,4}',
  'text-decoration': 'string',
  'text-transform': 'string'
}, _class$4.defaultAttributes = {
  color: '#000000',
  'font-family': 'Ubuntu, Helvetica, Arial, sans-serif',
  'font-size': '13px',
  'font-weight': 'normal',
  'line-height': '22px',
  padding: '15px 10px',
  target: '_blank',
  'text-decoration': 'none',
  'text-transform': 'uppercase'
}, _temp$3);

var _class$5, _temp$4;

var MjCarousel = (_temp$4 = _class$5 = function (_BodyComponent) {
  _inherits(MjCarousel, _BodyComponent);

  function MjCarousel() {
    var initialDatas = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, MjCarousel);

    var _this = _possibleConstructorReturn(this, (MjCarousel.__proto__ || _Object$getPrototypeOf(MjCarousel)).call(this, initialDatas));

    _this.componentHeadStyle = function () {
      var length = _this.props.children.length;
      var carouselId = _this.carouselId;


      if (!length) return '';

      var carouselCss = '\n    .mj-carousel {\n      -webkit-user-select: none;\n      -moz-user-select: none;\n      user-select: none;\n    }\n\n    .mj-carousel-' + _this.carouselId + '-icons-cell {\n      display: table-cell !important;\n      width: ' + _this.getAttribute('icon-width') + ' !important;\n    }\n\n    .mj-carousel-radio,\n    .mj-carousel-next,\n    .mj-carousel-previous {\n      display: none !important;\n    }\n\n    .mj-carousel-thumbnail,\n    .mj-carousel-next,\n    .mj-carousel-previous {\n      touch-action: manipulation;\n    }\n\n    ' + range(0, length).map(function (i) {
        return '.mj-carousel-' + carouselId + '-radio:checked ' + repeat('+ * ', i) + '+ .mj-carousel-content .mj-carousel-image';
      }).join(',') + ' {\n      display: none !important;\n    }\n\n    ' + range(0, length).map(function (i) {
        return '.mj-carousel-' + carouselId + '-radio-' + (i + 1) + ':checked ' + repeat('+ * ', length - i - 1) + '+ .mj-carousel-content .mj-carousel-image-' + (i + 1);
      }).join(',') + ' {\n      display: block !important;\n    }\n\n    .mj-carousel-previous-icons,\n    .mj-carousel-next-icons,\n    ' + range(0, length).map(function (i) {
        return '.mj-carousel-' + carouselId + '-radio-' + (i + 1) + ':checked ' + repeat('+ * ', length - i - 1) + '+ .mj-carousel-content .mj-carousel-next-' + ((i + 1 % length + length) % length + 1);
      }) + ',\n    ' + range(0, length).map(function (i) {
        return '.mj-carousel-' + carouselId + '-radio-' + (i + 1) + ':checked ' + repeat('+ * ', length - i - 1) + '+ .mj-carousel-content .mj-carousel-previous-' + ((i - 1 % length + length) % length + 1);
      }) + ' {\n      display: block !important;\n    }\n\n    ' + range(0, length).map(function (i) {
        return '.mj-carousel-' + carouselId + '-radio-' + (i + 1) + ':checked ' + repeat('+ * ', length - i - 1) + '+ .mj-carousel-content .mj-carousel-' + carouselId + '-thumbnail-' + (i + 1);
      }).join(',') + ' {\n      border-color: ' + _this.getAttribute('tb-selected-border-color') + ' !important;\n    }\n\n    .mj-carousel-image img + div,\n    .mj-carousel-thumbnail img + div {\n      display: none !important;\n    }\n\n    ' + range(0, length).map(function (i) {
        return '.mj-carousel-' + carouselId + '-thumbnail:hover ' + repeat('+ * ', length - i - 1) + '+ .mj-carousel-main .mj-carousel-image';
      }).join(',') + ' {\n      display: none !important;\n    }\n\n    .mj-carousel-thumbnail:hover {\n      border-color: ' + _this.getAttribute('tb-hover-border-color') + ' !important;\n    }\n\n    ' + range(0, length).map(function (i) {
        return '.mj-carousel-' + carouselId + '-thumbnail-' + (i + 1) + ':hover ' + repeat('+ * ', length - i - 1) + '+ .mj-carousel-main .mj-carousel-image-' + (i + 1);
      }).join(',') + ' {\n      display: block !important;\n    }\n    ';

      var fallback = '\n      .mj-carousel noinput { display:block !important; }\n      .mj-carousel noinput .mj-carousel-image-1 { display: block !important;  }\n      .mj-carousel noinput .mj-carousel-arrows,\n      .mj-carousel noinput .mj-carousel-thumbnails { display: none !important; }\n\n      [owa] .mj-carousel-thumbnail { display: none !important; }\n\n      @media screen yahoo {\n          .mj-carousel-' + _this.carouselId + '-icons-cell,\n          .mj-carousel-previous-icons,\n          .mj-carousel-next-icons {\n              display: none !important;\n          }\n\n          .mj-carousel-' + carouselId + '-radio-1:checked ' + repeat('+ *', length - 1) + '+ .mj-carousel-content .mj-carousel-' + carouselId + '-thumbnail-1 {\n              border-color: transparent;\n          }\n      }\n    ';

      return carouselCss + '\n' + fallback;
    };

    _this.carouselId = crypto.randomBytes(6).toString('hex');
    return _this;
  }

  _createClass(MjCarousel, [{
    key: 'getStyles',
    value: function getStyles() {
      // eslint-disable-line class-methods-use-this
      return {
        carousel: {
          div: {
            display: 'table',
            width: '100%',
            'table-layout': 'fixed',
            'text-align': 'center',
            'font-size': '0px'
          },
          table: {
            'caption-side': 'top',
            display: 'table-caption',
            'table-layout': 'fixed',
            width: '100%'
          }
        },
        images: {
          td: {
            padding: '0px'
          }
        },
        controls: {
          div: {
            display: 'none',
            'mso-hide': 'all'
          },
          img: {
            display: 'block',
            width: this.getAttribute('icon-width'),
            height: 'auto'
          },
          td: {
            'font-size': '0px',
            display: 'none',
            'mso-hide': 'all',
            padding: '0px'
          }
        }
      };
    }
  }, {
    key: 'thumbnailsWidth',
    value: function thumbnailsWidth() {
      if (!this.props.children.length) return 0;
      return this.getAttribute('tb-width') || min([this.context.parentWidth / this.props.children.length, 110]) + 'px';
    }
  }, {
    key: 'imagesAttributes',
    value: function imagesAttributes() {
      return map$1(this.children, 'attributes');
    }
  }, {
    key: 'generateRadios',
    value: function generateRadios() {
      return this.renderChildren(this.props.children, {
        renderer: function renderer(component) {
          return component.renderRadio();
        },
        attributes: {
          carouselId: this.carouselId
        }
      });
    }
  }, {
    key: 'generateThumbnails',
    value: function generateThumbnails() {
      if (this.getAttribute('thumbnails') !== 'visible') return '';

      return this.renderChildren(this.props.children, {
        attributes: {
          'tb-border': this.getAttribute('tb-border'),
          'tb-border-radius': this.getAttribute('tb-border-radius'),
          'tb-width': this.thumbnailsWidth(),
          carouselId: this.carouselId
        },
        renderer: function renderer(component) {
          return component.renderThumbnail();
        }
      });
    }
  }, {
    key: 'generateControls',
    value: function generateControls(direction, icon) {
      var _this2 = this;

      var iconWidth = parseInt(this.getAttribute('icon-width'), 10);

      return '\n      <td\n        ' + this.htmlAttributes({
        class: 'mj-carousel-' + this.carouselId + '-icons-cell',
        style: 'controls.td'
      }) + '\n      >\n        <div\n          ' + this.htmlAttributes({
        class: 'mj-carousel-' + direction + '-icons',
        style: 'controls.div'
      }) + '\n        >\n          ' + range(1, this.props.children.length + 1).map(function (i) {
        return '\n              <label\n                ' + _this2.htmlAttributes({
          for: 'mj-carousel-' + _this2.carouselId + '-radio-' + i,
          class: 'mj-carousel-' + direction + ' mj-carousel-' + direction + '-' + i
        }) + '\n              >\n                <img\n                  ' + _this2.htmlAttributes({
          src: icon,
          alt: direction,
          style: 'controls.img',
          width: iconWidth
        }) + '\n                />\n              </label>\n            ';
      }).join('') + '\n        </div>\n      </td>\n    ';
    }
  }, {
    key: 'generateImages',
    value: function generateImages() {
      return '\n      <td\n        ' + this.htmlAttributes({
        style: 'images.td'
      }) + '\n      >\n        <div\n          ' + this.htmlAttributes({
        class: 'mj-carousel-images'
      }) + '\n        >\n          ' + this.renderChildren(this.props.children, {
        attributes: {
          'border-radius': this.getAttribute('border-radius')
        }
      }) + '\n        </div>\n      </td>\n    ';
    }
  }, {
    key: 'generateCarousel',
    value: function generateCarousel() {
      return '\n      <table\n        ' + this.htmlAttributes({
        style: 'carousel.table',
        border: '0',
        'cell-padding': '0',
        'cell-spacing': '0',
        width: '100%',
        role: 'presentation',
        class: 'mj-carousel-main'
      }) + '\n      >\n        <tbody>\n          <tr>\n            ' + this.generateControls('previous', this.getAttribute('left-icon')) + '\n            ' + this.generateImages() + '\n            ' + this.generateControls('next', this.getAttribute('right-icon')) + '\n          </tr>\n        </tbody>\n      </table>\n    ';
    }
  }, {
    key: 'renderFallback',
    value: function renderFallback() {
      var children = this.props.children;

      if (children.length === 0) return '';

      return conditionalTag_2(this.renderChildren([children[0]], {
        attributes: {
          'border-radius': this.getAttribute('border-radius')
        }
      }));
    }
  }, {
    key: 'render',
    value: function render() {
      return '\n      ' + conditionalTag_2('\n        <div\n          ' + this.htmlAttributes({
        class: 'mj-carousel'
      }) + '\n        >\n          ' + this.generateRadios() + '\n          <div\n            ' + this.htmlAttributes({
        class: 'mj-carousel-content mj-carousel-' + this.carouselId + '-content',
        style: 'carousel.div'
      }) + '\n          >\n            ' + this.generateThumbnails() + '\n            ' + this.generateCarousel() + '\n          </div>\n        </div>\n      ', true) + '\n      ' + this.renderFallback() + '\n    ';
    }
  }]);

  return MjCarousel;
}(BodyComponent), _class$5.allowedAttributes = {
  align: 'enum(left,center,right)',
  'border-radius': 'unit(px,%)',
  'icon-width': 'unit(px,%)',
  'left-icon': 'string',
  padding: 'unit(px,%){1,4}',
  'padding-top': 'unit(px,%)',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'right-icon': 'string',
  thumbnails: 'enum(visible,hidden)',
  'tb-border': 'string',
  'tb-border-radius': 'unit(px,%)',
  'tb-hover-border-color': 'color',
  'tb-selected-border-color': 'color',
  'tb-width': 'unit(px,%)'
}, _class$5.defaultAttributes = {
  align: 'center',
  'border-radius': '6px',
  'icon-width': '44px',
  'left-icon': 'https://i.imgur.com/xTh3hln.png',
  'right-icon': 'https://i.imgur.com/os7o9kz.png',
  thumbnails: 'visible',
  'tb-border': '2px solid transparent',
  'tb-border-radius': '6px',
  'tb-hover-border-color': '#fead0d',
  'tb-selected-border-color': '#ccc'
}, _temp$4);

var _class$6, _temp$5;

var MjCarouselImage = (_temp$5 = _class$6 = function (_BodyComponent) {
  _inherits(MjCarouselImage, _BodyComponent);

  function MjCarouselImage() {
    _classCallCheck(this, MjCarouselImage);

    return _possibleConstructorReturn(this, (MjCarouselImage.__proto__ || _Object$getPrototypeOf(MjCarouselImage)).apply(this, arguments));
  }

  _createClass(MjCarouselImage, [{
    key: 'getStyles',
    value: function getStyles() {
      return {
        images: {
          img: {
            'border-radius': this.getAttribute('border-radius'),
            display: 'block',
            width: this.context.containerWidth,
            'max-width': '100%',
            height: 'auto'
          },
          firstImageDiv: {},
          otherImageDiv: {
            display: 'none',
            'mso-hide': 'all'
          }
        },
        radio: {
          input: {
            display: 'none',
            'mso-hide': 'all'
          }
        },
        thumbnails: {
          a: {
            border: this.getAttribute('tb-border'),
            'border-radius': this.getAttribute('tb-border-radius'),
            display: 'inline-block',
            overflow: 'hidden',
            width: this.getAttribute('tb-width')
          },
          img: {
            display: 'block',
            width: '100%',
            height: 'auto'
          }
        }
      };
    }
  }, {
    key: 'renderThumbnail',
    value: function renderThumbnail() {
      var _attributes = this.attributes,
          carouselId = _attributes.carouselId,
          src = _attributes.src,
          alt = _attributes.alt,
          width = _attributes['tb-width'],
          target = _attributes.target;

      var imgIndex = this.props.index + 1;
      var cssClass = suffixCssClasses(this.getAttribute('css-class'), 'thumbnail');

      return '\n      <a\n        ' + this.htmlAttributes({
        style: 'thumbnails.a',
        href: '#' + imgIndex,
        target: target,
        class: 'mj-carousel-thumbnail mj-carousel-' + carouselId + '-thumbnail mj-carousel-' + carouselId + '-thumbnail-' + imgIndex + ' ' + cssClass
      }) + '\n      >\n        <label ' + this.htmlAttributes({
        for: 'mj-carousel-' + carouselId + '-radio-' + imgIndex
      }) + '>\n          <img\n            ' + this.htmlAttributes({
        style: 'thumbnails.img',
        src: this.getAttribute('thumbnails-src') || src,
        alt: alt,
        width: parseInt(width, 10)
      }) + '\n          />\n        </label>\n      </a>\n    ';
    }
  }, {
    key: 'renderRadio',
    value: function renderRadio() {
      var index = this.props.index;

      var carouselId = this.getAttribute('carouselId');

      return '\n      <input\n        ' + this.htmlAttributes({
        class: 'mj-carousel-radio mj-carousel-' + carouselId + '-radio mj-carousel-' + carouselId + '-radio-' + (index + 1),
        checked: index === 0 ? 'checked' : null,
        type: 'radio',
        name: 'mj-carousel-radio-' + carouselId,
        id: 'mj-carousel-' + carouselId + '-radio-' + (index + 1),
        style: 'radio.input'
      }) + '\n      />\n    ';
    }
  }, {
    key: 'render',
    value: function render() {
      var _attributes2 = this.attributes,
          src = _attributes2.src,
          alt = _attributes2.alt,
          href = _attributes2.href,
          rel = _attributes2.rel,
          title = _attributes2.title;
      var index = this.props.index;


      var image = '\n      <img\n        ' + this.htmlAttributes({
        title: title,
        src: src,
        alt: alt,
        style: 'images.img',
        width: parseInt(this.context.containerWidth, 10),
        border: '0'
      }) + ' />\n    ';

      var cssClass = this.getAttribute('css-class') || '';

      return '\n      <div\n        ' + this.htmlAttributes({
        class: 'mj-carousel-image mj-carousel-image-' + (index + 1) + ' ' + cssClass,
        style: index === 0 ? 'images.firstImageDiv' : 'images.otherImageDiv'
      }) + '\n      >\n        ' + (href ? '<a href=' + href + ' rel=' + rel + ' target="_blank">' + image + '</a>' : image) + '\n      </div>\n    ';
    }
  }]);

  return MjCarouselImage;
}(BodyComponent), _class$6.endingTag = true, _class$6.allowedAttributes = {
  alt: 'string',
  href: 'string',
  rel: 'string',
  title: 'string',
  src: 'string',
  'thumbnails-src': 'string',
  'border-radius': 'unit(px,%){1,4}',
  'tb-border': 'string',
  'tb-border-radius': 'unit(px,%){1,4}'
}, _class$6.defaultAttributes = {
  target: '_blank'
}, _temp$5);

var _class$7, _temp2$1;

var MjAccordion = (_temp2$1 = _class$7 = function (_BodyComponent) {
  _inherits(MjAccordion, _BodyComponent);

  function MjAccordion() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, MjAccordion);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = MjAccordion.__proto__ || _Object$getPrototypeOf(MjAccordion)).call.apply(_ref, [this].concat(args))), _this), _this.headStyle = function () {
      return '\n      noinput.mj-accordion-checkbox { display:block!important; }\n\n      @media yahoo, only screen and (min-width:0) {\n        .mj-accordion-element { display:block; }\n        input.mj-accordion-checkbox, .mj-accordion-less { display:none!important; }\n        input.mj-accordion-checkbox + * .mj-accordion-title { cursor:pointer; touch-action:manipulation; -webkit-user-select:none; -moz-user-select:none; user-select:none; }\n        input.mj-accordion-checkbox + * .mj-accordion-content { overflow:hidden; display:none; }\n        input.mj-accordion-checkbox + * .mj-accordion-more { display:block!important; }\n        input.mj-accordion-checkbox:checked + * .mj-accordion-content { display:block; }\n        input.mj-accordion-checkbox:checked + * .mj-accordion-more { display:none!important; }\n        input.mj-accordion-checkbox:checked + * .mj-accordion-less { display:block!important; }\n      }\n\n      @goodbye { @gmail }\n    ';
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(MjAccordion, [{
    key: 'getStyles',
    value: function getStyles() {
      return {
        table: {
          width: '100%',
          'border-collapse': 'collapse',
          border: this.getAttribute('border'),
          'border-bottom': 'none',
          'font-family': this.getAttribute('font-family')
        }
      };
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var childrenAttr = ['border', 'icon-align', 'icon-width', 'icon-height', 'icon-position', 'icon-wrapped-url', 'icon-wrapped-alt', 'icon-unwrapped-url', 'icon-unwrapped-alt'].reduce(function (res, val) {
        return _extends({}, res, _defineProperty({}, val, _this2.getAttribute(val)));
      }, {});

      return '\n      <table\n        ' + this.htmlAttributes({
        'cell-spacing': '0',
        'cell-padding': '0',
        class: 'mj-accordion',
        style: 'table'
      }) + '\n      >\n        <tbody>\n          ' + this.renderChildren(this.props.children, {
        attributes: childrenAttr
      }) + '\n        </tbody>\n      </table>\n    ';
    }
  }]);

  return MjAccordion;
}(BodyComponent), _class$7.allowedAttributes = {
  'container-background-color': 'color',
  border: 'string',
  'font-family': 'string',
  'icon-align': 'enum(top,middle,bottom)',
  'icon-width': 'unit(px,%)',
  'icon-height': 'unit(px,%)',
  'icon-wrapped-url': 'string',
  'icon-wrapped-alt': 'string',
  'icon-unwrapped-url': 'string',
  'icon-unwrapped-alt': 'string',
  'icon-position': 'enum(left,right)',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  padding: 'unit(px,%){1,4}'
}, _class$7.defaultAttributes = {
  border: '2px solid black',
  'font-family': 'Ubuntu, Helvetica, Arial, sans-serif',
  'icon-align': 'middle',
  'icon-wrapped-url': 'http://i.imgur.com/bIXv1bk.png',
  'icon-wrapped-alt': '+',
  'icon-unwrapped-url': 'http://i.imgur.com/w4uTygT.png',
  'icon-unwrapped-alt': '-',
  'icon-position': 'right',
  'icon-height': '32px',
  'icon-width': '32px',
  padding: '10px 25px'
}, _temp2$1);

var _class$8, _temp$6;

var MjAccordionText = (_temp$6 = _class$8 = function (_BodyComponent) {
  _inherits(MjAccordionText, _BodyComponent);

  function MjAccordionText() {
    _classCallCheck(this, MjAccordionText);

    return _possibleConstructorReturn(this, (MjAccordionText.__proto__ || _Object$getPrototypeOf(MjAccordionText)).apply(this, arguments));
  }

  _createClass(MjAccordionText, [{
    key: 'getStyles',
    value: function getStyles() {
      return {
        td: {
          background: this.getAttribute('background-color'),
          'font-size': this.getAttribute('font-size'),
          'font-family': this.getAttribute('font-family'),
          color: this.getAttribute('color'),
          'padding-bottom': this.getAttribute('padding-bottom'),
          'padding-left': this.getAttribute('padding-left'),
          'padding-right': this.getAttribute('padding-right'),
          'padding-top': this.getAttribute('padding-top'),
          padding: this.getAttribute('padding')
        },
        table: {
          width: '100%',
          'border-bottom': this.getAttribute('border')
        }
      };
    }
  }, {
    key: 'renderContent',
    value: function renderContent() {
      return '\n      <td\n        ' + this.htmlAttributes({
        class: this.getAttribute('css-class'),
        style: 'td'
      }) + '\n      >\n        ' + this.getContent() + '\n      </td>\n    ';
    }
  }, {
    key: 'render',
    value: function render() {
      return '\n      <div\n        ' + this.htmlAttributes({
        class: 'mj-accordion-content'
      }) + '\n      >\n        <table\n          ' + this.htmlAttributes({
        'cell-spacing': '0',
        'cell-padding': '0',
        style: 'table'
      }) + '\n        >\n          <tbody>\n            <tr>\n              ' + this.renderContent() + '\n            </tr>\n          </tbody>\n        </table>\n      </div>\n    ';
    }
  }]);

  return MjAccordionText;
}(BodyComponent), _class$8.endingTag = true, _class$8.allowedAttributes = {
  'background-color': 'color',
  'font-size': 'unit(px)',
  'font-family': 'string',
  color: 'color',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  padding: 'unit(px,%){1,4}'
}, _class$8.defaultAttributes = {
  'font-size': '13px',
  padding: '16px'
}, _temp$6);

var _class$9, _temp$7;

var MjAccordionTitle = (_temp$7 = _class$9 = function (_BodyComponent) {
  _inherits(MjAccordionTitle, _BodyComponent);

  function MjAccordionTitle() {
    _classCallCheck(this, MjAccordionTitle);

    return _possibleConstructorReturn(this, (MjAccordionTitle.__proto__ || _Object$getPrototypeOf(MjAccordionTitle)).apply(this, arguments));
  }

  _createClass(MjAccordionTitle, [{
    key: 'getStyles',
    value: function getStyles() {
      return {
        td: {
          width: '100%',
          'background-color': this.getAttribute('background-color'),
          color: this.getAttribute('color'),
          'font-size': this.getAttribute('font-size'),
          'font-family': this.getAttribute('font-family'),
          'padding-bottom': this.getAttribute('padding-bottom'),
          'padding-left': this.getAttribute('padding-left'),
          'padding-right': this.getAttribute('padding-right'),
          'padding-top': this.getAttribute('padding-top'),
          padding: this.getAttribute('padding')
        },
        table: {
          width: '100%',
          'border-bottom': this.getAttribute('border')
        },
        td2: {
          padding: '16px',
          background: this.getAttribute('background-color'),
          'vertical-align': this.getAttribute('icon-align')
        },
        img: {
          display: 'none',
          width: this.getAttribute('icon-width'),
          height: this.getAttribute('icon-height')
        }
      };
    }
  }, {
    key: 'renderTitle',
    value: function renderTitle() {
      return '\n      <td\n        ' + this.htmlAttributes({
        class: this.getAttribute('css-class'),
        style: 'td'
      }) + '\n      >\n        ' + this.getContent() + '\n      </td>\n    ';
    }
  }, {
    key: 'renderIcons',
    value: function renderIcons() {
      return conditionalTag('\n      <td\n        ' + this.htmlAttributes({
        class: 'mj-accordion-ico',
        style: 'td2'
      }) + '\n      >\n        <img\n          ' + this.htmlAttributes({
        src: this.getAttribute('icon-wrapped-url'),
        alt: this.getAttribute('icon-wrapped-alt'),
        class: 'mj-accordion-more',
        style: 'img'
      }) + '\n        />\n        <img\n          ' + this.htmlAttributes({
        src: this.getAttribute('icon-unwrapped-url'),
        alt: this.getAttribute('icon-unwrapped-alt'),
        class: 'mj-accordion-less',
        style: 'img'
      }) + '\n        />\n      </td>\n    ', true);
    }
  }, {
    key: 'render',
    value: function render() {
      var contentElements = [this.renderTitle(), this.renderIcons()];
      var content = (this.getAttribute('icon-position') === 'right' ? contentElements : contentElements.reverse()).join('\n');

      return '\n      <div ' + this.htmlAttributes({ class: 'mj-accordion-title' }) + '>\n        <table\n          ' + this.htmlAttributes({
        'cell-spacing': '0',
        'cell-padding': '0',
        style: 'table'
      }) + '\n        >\n          <tbody>\n            <tr>\n              ' + content + '\n            </tr>\n          </tbody>\n        </table>\n      </div>\n    ';
    }
  }]);

  return MjAccordionTitle;
}(BodyComponent), _class$9.endingTag = true, _class$9.allowedAttributes = {
  'background-color': 'color',
  color: 'color',
  'font-size': 'unit(px)',
  'font-family': 'string',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  padding: 'unit(px,%){1,4}'
}, _class$9.defaultAttributes = {
  'font-size': '13px',
  padding: '16px'
}, _temp$7);

var _class$a, _temp$8;

var MjAccordionElement = (_temp$8 = _class$a = function (_BodyComponent) {
  _inherits(MjAccordionElement, _BodyComponent);

  function MjAccordionElement() {
    _classCallCheck(this, MjAccordionElement);

    return _possibleConstructorReturn(this, (MjAccordionElement.__proto__ || _Object$getPrototypeOf(MjAccordionElement)).apply(this, arguments));
  }

  _createClass(MjAccordionElement, [{
    key: 'getStyles',
    value: function getStyles() {
      return {
        td: {
          padding: '0px',
          'background-color': this.getAttribute('background-color')
        },
        label: {
          'font-size': '13px',
          'font-family': this.getAttribute('font-family')
        },
        input: {
          display: 'none'
        }
      };
    }
  }, {
    key: 'handleMissingChildren',
    value: function handleMissingChildren() {
      var _this2 = this;

      var children = this.props.children;

      var childrenAttr = ['border', 'icon-align', 'icon-width', 'icon-height', 'icon-position', 'icon-wrapped-url', 'icon-wrapped-alt', 'icon-unwrapped-url', 'icon-unwrapped-alt'].reduce(function (res, val) {
        return _extends({}, res, _defineProperty({}, val, _this2.getAttribute(val)));
      }, {});

      var result = [];

      if (!_.find(children, { tagName: 'mj-accordion-title' })) {
        result.push(new MjAccordionTitle({
          attributes: childrenAttr,
          context: this.getChildContext()
        }).render());
      }

      result.push(this.renderChildren(children, { attributes: childrenAttr }));

      if (!_.find(children, { tagName: 'mj-accordion-text' })) {
        result.push(new MjAccordionText({
          attributes: childrenAttr,
          context: this.getChildContext()
        }).render());
      }

      return result.join('\n');
    }
  }, {
    key: 'render',
    value: function render() {
      return '\n      <tr\n        ' + this.htmlAttributes({
        class: this.getAttribute('css-class')
      }) + '\n      >\n        <td ' + this.htmlAttributes({ style: 'td' }) + '>\n          <label\n            ' + this.htmlAttributes({
        class: 'mj-accordion-element',
        style: 'label'
      }) + '\n          >\n            ' + conditionalTag('\n              <input\n                ' + this.htmlAttributes({
        class: 'mj-accordion-checkbox',
        type: 'checkbox',
        style: 'input'
      }) + '\n              />\n            ', true) + '\n            <div>\n              ' + this.handleMissingChildren() + '\n            </div>\n          </label>\n        </td>\n      </tr>\n    ';
    }
  }]);

  return MjAccordionElement;
}(BodyComponent), _class$a.allowedAttributes = {
  'background-color': 'color',
  'font-family': 'string',
  'icon-align': 'enum(top,middle,bottom)',
  'icon-width': 'unit(px,%)',
  'icon-height': 'unit(px,%)',
  'icon-wrapped-url': 'string',
  'icon-wrapped-alt': 'string',
  'icon-unwrapped-url': 'string',
  'icon-unwrapped-alt': 'string',
  'icon-position': 'enum(left,right)'
}, _class$a.defaultAttributes = {
  title: {
    img: {
      width: '32px',
      height: '32px'
    }
  }
}, _temp$8);

var _class$b, _temp$9;

var MjBody = (_temp$9 = _class$b = function (_BodyComponent) {
  _inherits(MjBody, _BodyComponent);

  function MjBody() {
    _classCallCheck(this, MjBody);

    return _possibleConstructorReturn(this, (MjBody.__proto__ || _Object$getPrototypeOf(MjBody)).apply(this, arguments));
  }

  _createClass(MjBody, [{
    key: 'getChildContext',
    value: function getChildContext() {
      return _extends({}, this.context, {
        containerWidth: this.getAttribute('width')
      });
    }
  }, {
    key: 'getStyles',
    value: function getStyles() {
      return {
        div: {
          'background-color': this.getAttribute('background-color')
        }
      };
    }
  }, {
    key: 'render',
    value: function render() {
      var setBackgroundColor = this.context.setBackgroundColor;

      setBackgroundColor(this.getAttribute('background-color'));

      return '\n      <div\n        ' + this.htmlAttributes({
        class: this.getAttribute('css-class'),
        style: 'div'
      }) + '\n      >\n        ' + this.renderChildren() + '\n      </div>\n    ';
    }
  }]);

  return MjBody;
}(BodyComponent), _class$b.allowedAttributes = {
  width: 'unit(px,%)',
  'background-color': 'color'
}, _class$b.defaultAttributes = {
  width: '600px'
}, _temp$9);

var MjHead = function (_HeadComponent) {
  _inherits(MjHead, _HeadComponent);

  function MjHead() {
    _classCallCheck(this, MjHead);

    return _possibleConstructorReturn(this, (MjHead.__proto__ || _Object$getPrototypeOf(MjHead)).apply(this, arguments));
  }

  _createClass(MjHead, [{
    key: 'handler',
    value: function handler() {
      return this.handlerChildren();
    }
  }]);

  return MjHead;
}(HeadComponent);

var MjAttributes = function (_HeadComponent) {
  _inherits(MjAttributes, _HeadComponent);

  function MjAttributes() {
    _classCallCheck(this, MjAttributes);

    return _possibleConstructorReturn(this, (MjAttributes.__proto__ || _Object$getPrototypeOf(MjAttributes)).apply(this, arguments));
  }

  _createClass(MjAttributes, [{
    key: 'handler',
    value: function handler() {
      var add = this.context.add;
      var children = this.props.children;


      forEach(children, function (child) {
        var tagName = child.tagName,
            attributes = child.attributes,
            children = child.children;


        if (tagName === 'mj-class') {
          add('classes', attributes.name, omit(attributes, ['name']));

          add('classesDefault', attributes.name, reduce(children, function (acc, _ref) {
            var tagName = _ref.tagName,
                attributes = _ref.attributes;
            return _extends({}, acc, _defineProperty({}, tagName, attributes));
          }, {}));
        } else {
          add('defaultAttributes', tagName, attributes);
        }
      });
    }
  }]);

  return MjAttributes;
}(HeadComponent);

var _class$c, _temp$a;

var MjBreakpoint = (_temp$a = _class$c = function (_HeadComponent) {
  _inherits(MjBreakpoint, _HeadComponent);

  function MjBreakpoint() {
    _classCallCheck(this, MjBreakpoint);

    return _possibleConstructorReturn(this, (MjBreakpoint.__proto__ || _Object$getPrototypeOf(MjBreakpoint)).apply(this, arguments));
  }

  _createClass(MjBreakpoint, [{
    key: 'handler',
    value: function handler() {
      var add = this.context.add;


      add('breakpoint', this.getAttribute('width'));
    }
  }]);

  return MjBreakpoint;
}(HeadComponent), _class$c.endingTag = true, _class$c.allowedAttributes = {
  width: 'unit(px)'
}, _temp$a);

var _class$d, _temp$b;

var MjFont = (_temp$b = _class$d = function (_HeadComponent) {
  _inherits(MjFont, _HeadComponent);

  function MjFont() {
    _classCallCheck(this, MjFont);

    return _possibleConstructorReturn(this, (MjFont.__proto__ || _Object$getPrototypeOf(MjFont)).apply(this, arguments));
  }

  _createClass(MjFont, [{
    key: 'handler',
    value: function handler() {
      var add = this.context.add;


      add('fonts', this.getAttribute('name'), this.getAttribute('href'));
    }
  }]);

  return MjFont;
}(HeadComponent), _class$d.tagOmission = true, _class$d.allowedAttributes = {
  name: 'string',
  href: 'string'
}, _temp$b);

var _class$e, _temp$c;

var MjPreview = (_temp$c = _class$e = function (_HeadComponent) {
  _inherits(MjPreview, _HeadComponent);

  function MjPreview() {
    _classCallCheck(this, MjPreview);

    return _possibleConstructorReturn(this, (MjPreview.__proto__ || _Object$getPrototypeOf(MjPreview)).apply(this, arguments));
  }

  _createClass(MjPreview, [{
    key: 'handler',
    value: function handler() {
      var add = this.context.add;


      add('preview', this.getContent());
    }
  }]);

  return MjPreview;
}(HeadComponent), _class$e.endingTag = true, _temp$c);

var _class$f, _temp$d;

var MjStyle = (_temp$d = _class$f = function (_HeadComponent) {
  _inherits(MjStyle, _HeadComponent);

  function MjStyle() {
    _classCallCheck(this, MjStyle);

    return _possibleConstructorReturn(this, (MjStyle.__proto__ || _Object$getPrototypeOf(MjStyle)).apply(this, arguments));
  }

  _createClass(MjStyle, [{
    key: 'handler',
    value: function handler() {
      var add = this.context.add;


      add(this.getAttribute('inline') === 'inline' ? 'inlineStyle' : 'style', this.getContent());
    }
  }]);

  return MjStyle;
}(HeadComponent), _class$f.endingTag = true, _class$f.allowedAttributes = {
  inline: 'string'
}, _temp$d);

var _class$g, _temp$e;

var MjTitle = (_temp$e = _class$g = function (_HeadComponent) {
  _inherits(MjTitle, _HeadComponent);

  function MjTitle() {
    _classCallCheck(this, MjTitle);

    return _possibleConstructorReturn(this, (MjTitle.__proto__ || _Object$getPrototypeOf(MjTitle)).apply(this, arguments));
  }

  _createClass(MjTitle, [{
    key: 'handler',
    value: function handler() {
      var add = this.context.add;


      add('title', this.getContent());
    }
  }]);

  return MjTitle;
}(HeadComponent), _class$g.endingTag = true, _temp$e);

var widthParser_1 = createCommonjsModule(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = widthParser;
var unitRegex = /[\d.,]*(\D*)$/;

function widthParser(width) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var _options$parseFloatTo = options.parseFloatToInt,
      parseFloatToInt = _options$parseFloatTo === undefined ? true : _options$parseFloatTo;

  var widthUnit = unitRegex.exec(width.toString())[1];
  var unitParsers = {
    default: parseInt,
    px: parseInt,
    '%': parseFloatToInt ? parseInt : parseFloat
  };
  var parser = unitParsers[widthUnit] || unitParsers.default;

  return {
    parsedWidth: parser(width),
    unit: widthUnit || 'px'
  };
}
module.exports = exports['default'];
});

var widthParser = unwrapExports(widthParser_1);

var _class$h, _temp2$2;

var makeBackgroundString = fp.flow(fp.filter(fp.identity), fp.join(' '));

var MjHero = (_temp2$2 = _class$h = function (_BodyComponent) {
  _inherits(MjHero, _BodyComponent);

  function MjHero() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, MjHero);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = MjHero.__proto__ || _Object$getPrototypeOf(MjHero)).call.apply(_ref, [this].concat(args))), _this), _this.getBackground = function () {
      return makeBackgroundString([_this.getAttribute('background-color')].concat(_toConsumableArray(_this.getAttribute('background-url') ? ['url(' + _this.getAttribute('background-url') + ')', 'no-repeat', _this.getAttribute('background-position') + ' / cover'] : [])));
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(MjHero, [{
    key: 'getChildContext',
    value: function getChildContext() {
      // Refactor -- removePaddingFor(width, ['padding', 'inner-padding'])
      var containerWidth = this.context.containerWidth;

      var paddingSize = this.getShorthandAttrValue('padding', 'left') + this.getShorthandAttrValue('padding', 'right');

      var currentContainerWidth = parseFloat(containerWidth) + 'px';

      var _widthParser = widthParser(currentContainerWidth, {
        parseFloatToInt: false
      }),
          unit = _widthParser.unit,
          parsedWidth = _widthParser.parsedWidth;

      if (unit === '%') {
        currentContainerWidth = parseFloat(containerWidth) * parsedWidth / 100 - paddingSize + 'px';
      } else {
        currentContainerWidth = parsedWidth - paddingSize + 'px';
      }

      return _extends({}, this.context, {
        containerWidth: currentContainerWidth
      });
    }
  }, {
    key: 'getStyles',
    value: function getStyles() {
      var containerWidth = this.context.containerWidth;

      var backgroundRatio = Math.round(parseInt(this.getAttribute('background-height'), 10) / parseInt(this.getAttribute('background-width'), 10) * 100);

      var width = this.getAttribute('background-width') || containerWidth;

      return {
        div: {
          margin: '0 auto',
          'max-width': containerWidth
        },
        table: {
          width: '100%'
        },
        tr: {
          'vertical-align': 'top'
        },
        'td-fluid': {
          width: '0.01%',
          'padding-bottom': backgroundRatio + '%',
          'mso-padding-bottom-alt': '0'
        },
        hero: {
          background: this.getBackground(),
          'background-position': this.getAttribute('background-position'),
          'background-repeat': 'no-repeat',
          padding: this.getAttribute('padding'),
          'padding-top': this.getAttribute('padding-top'),
          'padding-left': this.getAttribute('padding-left'),
          'padding-right': this.getAttribute('padding-right'),
          'padding-bottom': this.getAttribute('padding-bottom'),
          'vertical-align': this.getAttribute('vertical-align')
        },
        'outlook-table': {
          width: containerWidth
        },
        'outlook-td': {
          'line-height': 0,
          'font-size': 0,
          'mso-line-height-rule': 'exactly'
        },
        'outlook-inner-table': {
          width: containerWidth
        },
        'outlook-image': {
          border: '0',
          height: this.getAttribute('background-height'),
          'mso-position-horizontal': 'center',
          position: 'absolute',
          top: 0,
          width: width,
          'z-index': '-3'
        },
        'outlook-inner-td': {
          'background-color': this.getAttribute('inner-background-color'),
          padding: this.getAttribute('inner-padding'),
          'padding-top': this.getAttribute('inner-padding-top'),
          'padding-left': this.getAttribute('inner-padding-left'),
          'padding-right': this.getAttribute('inner-padding-right'),
          'padding-bottom': this.getAttribute('inner-padding-bottom')
        },
        'inner-table': {
          width: '100%',
          margin: '0px'
        },
        'inner-div': {
          'background-color': this.getAttribute('inner-background-color'),
          float: this.getAttribute('align'),
          margin: '0px auto',
          width: this.getAttribute('width')
        }
      };
    }
  }, {
    key: 'renderContent',
    value: function renderContent() {
      var containerWidth = this.context.containerWidth;
      var children = this.props.children;


      return '\n      <!--[if mso | IE]>\n        <table\n          ' + this.htmlAttributes({
        align: this.getAttribute('align'),
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        style: 'outlook-inner-table',
        width: containerWidth.replace('px', '')
      }) + '\n        >\n          <tr>\n            <td ' + this.htmlAttributes({ style: 'outlook-inner-td' }) + '>\n      <![endif]-->\n      <div\n        ' + this.htmlAttributes({
        align: this.getAttribute('align'),
        class: 'mj-hero-content',
        style: 'inner-div'
      }) + '\n      >\n        <table\n          ' + this.htmlAttributes({
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation',
        style: 'inner-table'
      }) + '\n        >\n          <tr>\n            <td ' + this.htmlAttributes({ style: 'inner-td' }) + ' >\n              <table\n                ' + this.htmlAttributes({
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation',
        style: 'inner-table'
      }) + '\n              >\n                ' + this.renderChildren(children, {
        renderer: function renderer(component) {
          return (// eslint-disable-line no-confusing-arrow
            component.constructor.isRawElement() ? component.render() : '\n                    <tr>\n                      <td\n                        ' + component.htmlAttributes({
              align: component.getAttribute('align'),
              background: component.getAttribute('container-background-color'),
              class: component.getAttribute('css-class'),
              style: {
                background: component.getAttribute('container-background-color'),
                'font-size': '0px',
                padding: component.getAttribute('padding'),
                'padding-top': component.getAttribute('padding-top'),
                'padding-right': component.getAttribute('padding-right'),
                'padding-bottom': component.getAttribute('padding-bottom'),
                'padding-left': component.getAttribute('padding-left'),
                'word-break': 'break-word'
              }
            }) + '\n                      >\n                        ' + component.render() + '\n                      </td>\n                    </tr>\n                  '
          );
        }
      }) + '\n              </table>\n            </td>\n          </tr>\n        </table>\n      </div>\n      <!--[if mso | IE]>\n            </td>\n          </tr>\n        </table>\n      <![endif]-->\n    ';
    }
  }, {
    key: 'renderMode',
    value: function renderMode() {
      var commonAttributes = {
        background: this.getAttribute('background-url'),
        style: 'hero'

        /* eslint-disable no-alert, no-case-declarations */
      };switch (this.getAttribute('mode')) {
        case 'fluid-height':
          var magicTd = this.htmlAttributes({ style: 'td-fluid' });

          return '\n          <td ' + magicTd + ' />\n          <td ' + this.htmlAttributes(_extends({}, commonAttributes)) + '>\n            ' + this.renderContent() + '\n          </td>\n          <td ' + magicTd + ' />\n        ';
        case 'fixed-height':
        default:
          var height = parseInt(this.getAttribute('height'), 10) - this.getShorthandAttrValue('padding', 'top') - this.getShorthandAttrValue('padding', 'bottom');

          return '\n          <td\n            ' + this.htmlAttributes(_extends({}, commonAttributes, {
            height: height
          })) + '\n          >\n            ' + this.renderContent() + '\n          </td>\n        ';
      }
      /* eslint-enable no-alert, no-case-declarations */
    }
  }, {
    key: 'render',
    value: function render() {
      var containerWidth = this.context.containerWidth;


      return '\n      <!--[if mso | IE]>\n        <table\n          ' + this.htmlAttributes({
        align: 'center',
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation',
        style: 'outlook-table',
        width: parseInt(containerWidth, 10)
      }) + '\n        >\n          <tr>\n            <td ' + this.htmlAttributes({ style: 'outlook-td' }) + '>\n              <v:image\n                ' + this.htmlAttributes({
        style: 'outlook-image',
        src: this.getAttribute('background-url'),
        'xmlns:v': 'urn:schemas-microsoft-com:vml'
      }) + '\n              />\n      <![endif]-->\n      <div\n        ' + this.htmlAttributes({
        align: this.getAttribute('align'),
        class: this.getAttribute('css-class'),
        style: 'div'
      }) + '\n      >\n        <table\n          ' + this.htmlAttributes({
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation',
        style: 'table'
      }) + '\n        >\n          <tr\n            ' + this.htmlAttributes({
        style: 'tr'
      }) + '\n          >\n            ' + this.renderMode() + '\n          </tr>\n      </table>\n    </div>\n    <!--[if mso | IE]>\n          </td>\n        </tr>\n      </table>\n    <![endif]-->\n    ';
    }
  }]);

  return MjHero;
}(BodyComponent), _class$h.allowedAttributes = {
  mode: 'string',
  height: 'unit(px,%)',
  'background-url': 'string',
  'background-width': 'unit(px,%)',
  'background-height': 'unit(px,%)',
  'background-position': 'string',
  'container-background-color': 'color',
  'inner-background-color': 'color',
  'inner-padding': 'unit(px,%){1,4}',
  'inner-padding-top': 'unit(px,%)',
  'inner-padding-left': 'unit(px,%)',
  'inner-padding-right': 'unit(px,%)',
  'inner-padding-bottom': 'unit(px,%)',
  padding: 'unit(px,%){1,4}',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  'background-color': 'color',
  'vertical-align': 'enum(top,bottom,middle)'
}, _class$h.defaultAttributes = {
  mode: 'fixed-height',
  height: '0px',
  'background-url': null,
  'background-position': 'center center',
  padding: '0px',
  'padding-bottom': null,
  'padding-left': null,
  'padding-right': null,
  'padding-top': null,
  'background-color': '#ffffff',
  'vertical-align': 'top'
}, _temp2$2);

var _class$i, _temp$f;

var MjButton = (_temp$f = _class$i = function (_BodyComponent) {
  _inherits(MjButton, _BodyComponent);

  function MjButton() {
    _classCallCheck(this, MjButton);

    return _possibleConstructorReturn(this, (MjButton.__proto__ || _Object$getPrototypeOf(MjButton)).apply(this, arguments));
  }

  _createClass(MjButton, [{
    key: 'getStyles',
    value: function getStyles() {
      return {
        table: {
          'border-collapse': 'separate',
          width: this.getAttribute('width'),
          'line-height': '100%'
        },
        td: {
          border: this.getAttribute('border'),
          'border-bottom': this.getAttribute('border-bottom'),
          'border-left': this.getAttribute('border-left'),
          'border-radius': this.getAttribute('border-radius'),
          'border-right': this.getAttribute('border-right'),
          'border-top': this.getAttribute('border-top'),
          cursor: 'auto',
          'font-style': this.getAttribute('font-style'),
          height: this.getAttribute('height'),
          'mso-padding-alt': this.getAttribute('inner-padding'),
          'text-align': this.getAttribute('text-align'),
          background: this.getAttribute('background-color')
        },
        content: {
          display: 'inline-block',
          width: this.calculateAWidth(this.getAttribute('width')),
          background: this.getAttribute('background-color'),
          color: this.getAttribute('color'),
          'font-family': this.getAttribute('font-family'),
          'font-size': this.getAttribute('font-size'),
          'font-style': this.getAttribute('font-style'),
          'font-weight': this.getAttribute('font-weight'),
          'line-height': this.getAttribute('line-height'),
          margin: '0',
          'text-decoration': this.getAttribute('text-decoration'),
          'text-transform': this.getAttribute('text-transform'),
          padding: this.getAttribute('inner-padding'),
          'mso-padding-alt': '0px',
          'border-radius': this.getAttribute('border-radius')
        }
      };
    }
  }, {
    key: 'calculateAWidth',
    value: function calculateAWidth(width) {
      if (!width) return null;

      var _widthParser = widthParser(width),
          parsedWidth = _widthParser.parsedWidth,
          unit = _widthParser.unit;

      // impossible to handle percents because it depends on padding and text width


      if (unit !== 'px') return null;

      var _getBoxWidths = this.getBoxWidths(),
          borders = _getBoxWidths.borders;

      var innerPaddings = this.getShorthandAttrValue('inner-padding', 'left') + this.getShorthandAttrValue('inner-padding', 'right');

      return parsedWidth - innerPaddings - borders + 'px';
    }
  }, {
    key: 'render',
    value: function render() {
      var tag = this.getAttribute('href') ? 'a' : 'p';

      return '\n      <table\n        ' + this.htmlAttributes({
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation',
        style: 'table'
      }) + '\n      >\n        <tr>\n          <td\n            ' + this.htmlAttributes({
        align: 'center',
        bgcolor: this.getAttribute('background-color') === 'none' ? undefined : this.getAttribute('background-color'),
        role: 'presentation',
        style: 'td',
        valign: this.getAttribute('vertical-align')
      }) + '\n          >\n            <' + tag + '\n              ' + this.htmlAttributes({
        href: this.getAttribute('href'),
        rel: this.getAttribute('rel'),
        name: this.getAttribute('name'),
        style: 'content',
        target: tag === 'a' ? this.getAttribute('target') : undefined
      }) + '\n            >\n              ' + this.getContent() + '\n            </' + tag + '>\n          </td>\n        </tr>\n      </table>\n    ';
    }
  }]);

  return MjButton;
}(BodyComponent), _class$i.endingTag = true, _class$i.allowedAttributes = {
  align: 'enum(left,center,right)',
  'background-color': 'color',
  'border-bottom': 'string',
  'border-left': 'string',
  'border-radius': 'string',
  'border-right': 'string',
  'border-top': 'string',
  border: 'string',
  color: 'color',
  'container-background-color': 'color',
  'font-family': 'string',
  'font-size': 'unit(px)',
  'font-style': 'string',
  'font-weight': 'string',
  height: 'unit(px,%)',
  href: 'string',
  name: 'string',
  'inner-padding': 'unit(px,%){1,4}',
  'line-height': 'unit(px,%,)',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  padding: 'unit(px,%){1,4}',
  rel: 'string',
  target: 'string',
  'text-decoration': 'string',
  'text-transform': 'string',
  'vertical-align': 'enum(top,bottom,middle)',
  'text-align': 'enum(left,right,center)',
  width: 'unit(px,%)'
}, _class$i.defaultAttributes = {
  align: 'center',
  'background-color': '#414141',
  border: 'none',
  'border-radius': '3px',
  color: '#ffffff',
  'font-family': 'Ubuntu, Helvetica, Arial, sans-serif',
  'font-size': '13px',
  'font-weight': 'normal',
  'inner-padding': '10px 25px',
  'line-height': '120%',
  padding: '10px 25px',
  target: '_blank',
  'text-decoration': 'none',
  'text-transform': 'none',
  'vertical-align': 'middle'
}, _temp$f);

var _class$j, _temp$g;

var MjColumn = (_temp$g = _class$j = function (_BodyComponent) {
  _inherits(MjColumn, _BodyComponent);

  function MjColumn() {
    _classCallCheck(this, MjColumn);

    return _possibleConstructorReturn(this, (MjColumn.__proto__ || _Object$getPrototypeOf(MjColumn)).apply(this, arguments));
  }

  _createClass(MjColumn, [{
    key: 'getChildContext',
    value: function getChildContext() {
      var parentWidth = this.context.containerWidth;
      var nonRawSiblings = this.props.nonRawSiblings;

      var _getBoxWidths = this.getBoxWidths(),
          borders = _getBoxWidths.borders,
          paddings = _getBoxWidths.paddings;

      var allPaddings = paddings + borders;

      var containerWidth = this.getAttribute('width') || parseFloat(parentWidth) / nonRawSiblings + 'px';

      var _widthParser = widthParser(containerWidth, {
        parseFloatToInt: false
      }),
          unit = _widthParser.unit,
          parsedWidth = _widthParser.parsedWidth;

      if (unit === '%') {
        containerWidth = parseFloat(parentWidth) * parsedWidth / 100 - allPaddings + 'px';
      } else {
        containerWidth = parsedWidth - allPaddings + 'px';
      }

      return _extends({}, this.context, {
        containerWidth: containerWidth
      });
    }
  }, {
    key: 'getStyles',
    value: function getStyles() {
      var tableStyle = {
        'background-color': this.getAttribute('background-color'),
        border: this.getAttribute('border'),
        'border-bottom': this.getAttribute('border-bottom'),
        'border-left': this.getAttribute('border-left'),
        'border-radius': this.getAttribute('border-radius'),
        'border-right': this.getAttribute('border-right'),
        'border-top': this.getAttribute('border-top'),
        'vertical-align': this.getAttribute('vertical-align')
      };

      return {
        div: {
          'font-size': '0px',
          'text-align': 'left',
          direction: this.getAttribute('direction'),
          display: 'inline-block',
          'vertical-align': this.getAttribute('vertical-align'),
          width: this.getMobileWidth()
        },
        table: _extends({}, this.hasGutter() ? {} : tableStyle),
        tdOutlook: {
          'vertical-align': this.getAttribute('vertical-align'),
          width: this.getWidthAsPixel()
        },
        gutter: _extends({}, tableStyle, {
          padding: this.getAttribute('padding'),
          'padding-top': this.getAttribute('padding-top'),
          'padding-right': this.getAttribute('padding-right'),
          'padding-bottom': this.getAttribute('padding-bottom'),
          'padding-left': this.getAttribute('padding-left')
        })
      };
    }
  }, {
    key: 'getMobileWidth',
    value: function getMobileWidth() {
      var containerWidth = this.context.containerWidth;
      var nonRawSiblings = this.props.nonRawSiblings;

      var width = this.getAttribute('width');
      var mobileWidth = this.getAttribute('mobileWidth');

      if (mobileWidth !== 'mobileWidth') {
        return '100%';
      } else if (width === undefined) {
        return parseInt(100 / nonRawSiblings, 10) + '%';
      }

      var _widthParser2 = widthParser(width, {
        parseFloatToInt: false
      }),
          unit = _widthParser2.unit,
          parsedWidth = _widthParser2.parsedWidth;

      switch (unit) {
        case '%':
          return width;
        case 'px':
        default:
          return parsedWidth / parseInt(containerWidth, 10) + '%';
      }
    }
  }, {
    key: 'getWidthAsPixel',
    value: function getWidthAsPixel() {
      var containerWidth = this.context.containerWidth;

      var _widthParser3 = widthParser(this.getParsedWidth(true), {
        parseFloatToInt: false
      }),
          unit = _widthParser3.unit,
          parsedWidth = _widthParser3.parsedWidth;

      if (unit === '%') {
        return parseFloat(containerWidth) * parsedWidth / 100 + 'px';
      }
      return parsedWidth + 'px';
    }
  }, {
    key: 'getParsedWidth',
    value: function getParsedWidth(toString) {
      var nonRawSiblings = this.props.nonRawSiblings;


      var width = this.getAttribute('width') || 100 / nonRawSiblings + '%';

      var _widthParser4 = widthParser(width, {
        parseFloatToInt: false
      }),
          unit = _widthParser4.unit,
          parsedWidth = _widthParser4.parsedWidth;

      if (toString) {
        return '' + parsedWidth + unit;
      }

      return {
        unit: unit,
        parsedWidth: parsedWidth
      };
    }
  }, {
    key: 'getColumnClass',
    value: function getColumnClass() {
      var addMediaQuery = this.context.addMediaQuery;


      var className = '';

      var _getParsedWidth = this.getParsedWidth(),
          parsedWidth = _getParsedWidth.parsedWidth,
          unit = _getParsedWidth.unit;

      switch (unit) {
        case '%':
          className = 'mj-column-per-' + parseInt(parsedWidth, 10);
          break;

        case 'px':
        default:
          className = 'mj-column-px-' + parseInt(parsedWidth, 10);
          break;
      }

      // Add className to media queries
      addMediaQuery(className, {
        parsedWidth: parsedWidth,
        unit: unit
      });

      return className;
    }
  }, {
    key: 'hasGutter',
    value: function hasGutter() {
      var _this2 = this;

      return ['padding', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top'].some(function (attr) {
        return _this2.getAttribute(attr) != null;
      });
    }
  }, {
    key: 'renderGutter',
    value: function renderGutter() {
      return '\n      <table\n        ' + this.htmlAttributes({
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation',
        width: '100%'
      }) + '\n      >\n        <tbody>\n          <tr>\n            <td ' + this.htmlAttributes({ style: 'gutter' }) + '>\n              ' + this.renderColumn() + '\n            </td>\n          </tr>\n        </tbody>\n      </table>\n    ';
    }
  }, {
    key: 'renderColumn',
    value: function renderColumn() {
      var children = this.props.children;


      return '\n      <table\n        ' + this.htmlAttributes({
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation',
        style: 'table',
        width: '100%'
      }) + '\n      >\n        ' + this.renderChildren(children, {
        renderer: function renderer(component) {
          return (// eslint-disable-line no-confusing-arrow
            component.constructor.isRawElement() ? component.render() : '\n            <tr>\n              <td\n                ' + component.htmlAttributes({
              align: component.getAttribute('align'),
              'vertical-align': component.getAttribute('vertical-align'),
              class: component.getAttribute('css-class'),
              style: {
                background: component.getAttribute('container-background-color'),
                'font-size': '0px',
                padding: component.getAttribute('padding'),
                'padding-top': component.getAttribute('padding-top'),
                'padding-right': component.getAttribute('padding-right'),
                'padding-bottom': component.getAttribute('padding-bottom'),
                'padding-left': component.getAttribute('padding-left'),
                'word-break': 'break-word'
              }
            }) + '\n              >\n                ' + component.render() + '\n              </td>\n            </tr>\n          '
          );
        }
      }) + '\n      </table>\n    ';
    }
  }, {
    key: 'render',
    value: function render() {
      var classesName = this.getColumnClass() + ' outlook-group-fix';

      if (this.getAttribute('css-class')) {
        classesName += ' ' + this.getAttribute('css-class');
      }

      return '\n      <div\n        ' + this.htmlAttributes({
        class: classesName,
        style: 'div'
      }) + '\n      >\n        ' + (this.hasGutter() ? this.renderGutter() : this.renderColumn()) + '\n      </div>\n    ';
    }
  }]);

  return MjColumn;
}(BodyComponent), _class$j.allowedAttributes = {
  'background-color': 'color',
  border: 'string',
  'border-bottom': 'string',
  'border-left': 'string',
  'border-radius': 'unit(px,%){1,4}',
  'border-right': 'string',
  'border-top': 'string',
  direction: 'enum(ltr,rtl)',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  padding: 'unit(px,%){1,4}',
  'vertical-align': 'enum(top,bottom,middle)',
  width: 'unit(px,%)'
}, _class$j.defaultAttributes = {
  direction: 'ltr',
  'vertical-align': 'top'
}, _temp$g);

var _class$k, _temp$h;

var MjDivider = (_temp$h = _class$k = function (_BodyComponent) {
  _inherits(MjDivider, _BodyComponent);

  function MjDivider() {
    _classCallCheck(this, MjDivider);

    return _possibleConstructorReturn(this, (MjDivider.__proto__ || _Object$getPrototypeOf(MjDivider)).apply(this, arguments));
  }

  _createClass(MjDivider, [{
    key: 'getStyles',
    value: function getStyles() {
      var _this2 = this;

      var p = {
        'border-top': ['style', 'width', 'color'].map(function (attr) {
          return _this2.getAttribute('border-' + attr);
        }).join(' '),
        'font-size': 1,
        margin: '0px auto',
        width: this.getAttribute('width')
      };

      return {
        p: p,
        outlook: _extends({}, p, {
          width: this.getOutlookWidth()
        })
      };
    }
  }, {
    key: 'getOutlookWidth',
    value: function getOutlookWidth() {
      var containerWidth = this.context.containerWidth;

      var paddingSize = this.getShorthandAttrValue('padding', 'left') + this.getShorthandAttrValue('padding', 'right');

      var width = this.getAttribute('width');

      var _widthParser = widthParser(width),
          parsedWidth = _widthParser.parsedWidth,
          unit = _widthParser.unit;

      switch (unit) {
        case '%':
          return parseInt(containerWidth, 10) * parseInt(parsedWidth, 10) / 100 - paddingSize + 'px';
        case 'px':
          return width;
        default:
          return parseInt(containerWidth, 10) - paddingSize + 'px';
      }
    }
  }, {
    key: 'renderAfter',
    value: function renderAfter() {
      return '\n      <!--[if mso | IE]>\n        <table\n          ' + this.htmlAttributes({
        align: 'center',
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        style: 'outlook',
        role: 'presentation',
        width: this.getOutlookWidth()
      }) + '\n        >\n          <tr>\n            <td style="height:0;line-height:0;">\n              &nbsp;\n            </td>\n          </tr>\n        </table>\n      <![endif]-->\n    ';
    }
  }, {
    key: 'render',
    value: function render() {
      return '\n      <p\n        ' + this.htmlAttributes({
        style: 'p'
      }) + '\n      >\n      </p>\n      ' + this.renderAfter() + '\n    ';
    }
  }]);

  return MjDivider;
}(BodyComponent), _class$k.tagOmission = true, _class$k.allowedAttributes = {
  'border-color': 'color',
  'border-style': 'string',
  'border-width': 'unit(px)',
  'container-background-color': 'color',
  padding: 'unit(px,%){1,4}',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  width: 'unit(px,%)'
}, _class$k.defaultAttributes = {
  'border-color': '#000000',
  'border-style': 'solid',
  'border-width': '4px',
  padding: '10px 25px',
  width: '100%'
}, _temp$h);

var _class$l, _temp$i;

var MjGroup = (_temp$i = _class$l = function (_BodyComponent) {
  _inherits(MjGroup, _BodyComponent);

  function MjGroup() {
    _classCallCheck(this, MjGroup);

    return _possibleConstructorReturn(this, (MjGroup.__proto__ || _Object$getPrototypeOf(MjGroup)).apply(this, arguments));
  }

  _createClass(MjGroup, [{
    key: 'getChildContext',
    value: function getChildContext() {
      var parentWidth = this.context.containerWidth;
      var _props = this.props,
          nonRawSiblings = _props.nonRawSiblings,
          children = _props.children;

      var paddingSize = this.getShorthandAttrValue('padding', 'left') + this.getShorthandAttrValue('padding', 'right');

      var containerWidth = this.getAttribute('width') || parseFloat(parentWidth) / nonRawSiblings + 'px';

      var _widthParser = widthParser(containerWidth, {
        parseFloatToInt: false
      }),
          unit = _widthParser.unit,
          parsedWidth = _widthParser.parsedWidth;

      if (unit === '%') {
        containerWidth = parseFloat(parentWidth) * parsedWidth / 100 - paddingSize + 'px';
      } else {
        containerWidth = parsedWidth - paddingSize + 'px';
      }

      return _extends({}, this.context, {
        containerWidth: containerWidth,
        nonRawSiblings: children.length
      });
    }
  }, {
    key: 'getStyles',
    value: function getStyles() {
      return {
        div: {
          'font-size': '0',
          'line-height': '0',
          'text-align': 'left',
          display: 'inline-block',
          width: '100%',
          direction: this.getAttribute('direction'),
          'vertical-align': this.getAttribute('vertical-align'),
          'background-color': this.getAttribute('background-color')
        },
        tdOutlook: {
          'vertical-align': this.getAttribute('vertical-align'),
          width: this.getWidthAsPixel()
        }
      };
    }
  }, {
    key: 'getParsedWidth',
    value: function getParsedWidth(toString) {
      var nonRawSiblings = this.props.nonRawSiblings;


      var width = this.getAttribute('width') || 100 / nonRawSiblings + '%';

      var _widthParser2 = widthParser(width, {
        parseFloatToInt: false
      }),
          unit = _widthParser2.unit,
          parsedWidth = _widthParser2.parsedWidth;

      if (toString) {
        return '' + parsedWidth + unit;
      }

      return {
        unit: unit,
        parsedWidth: parsedWidth
      };
    }
  }, {
    key: 'getWidthAsPixel',
    value: function getWidthAsPixel() {
      var containerWidth = this.context.containerWidth;

      var _widthParser3 = widthParser(this.getParsedWidth(true), {
        parseFloatToInt: false
      }),
          unit = _widthParser3.unit,
          parsedWidth = _widthParser3.parsedWidth;

      if (unit === '%') {
        return parseFloat(containerWidth) * parsedWidth / 100 + 'px';
      }
      return parsedWidth + 'px';
    }
  }, {
    key: 'getColumnClass',
    value: function getColumnClass() {
      var addMediaQuery = this.context.addMediaQuery;


      var className = '';

      var _getParsedWidth = this.getParsedWidth(),
          parsedWidth = _getParsedWidth.parsedWidth,
          unit = _getParsedWidth.unit;

      switch (unit) {
        case '%':
          className = 'mj-column-per-' + parseInt(parsedWidth, 10);
          break;

        case 'px':
        default:
          className = 'mj-column-px-' + parseInt(parsedWidth, 10);
          break;
      }

      // Add className to media queries
      addMediaQuery(className, {
        parsedWidth: parsedWidth,
        unit: unit
      });

      return className;
    }
  }, {
    key: 'render',
    value: function render() {
      var _props2 = this.props,
          children = _props2.children,
          nonRawSiblings = _props2.nonRawSiblings;

      var _getChildContext = this.getChildContext(),
          groupWidth = _getChildContext.containerWidth;

      var containerWidth = this.context.containerWidth;


      var getElementWidth = function getElementWidth(width) {
        if (!width) {
          return parseInt(containerWidth, 10) / parseInt(nonRawSiblings, 10) + 'px';
        }

        var _widthParser4 = widthParser(width, {
          parseFloatToInt: false
        }),
            unit = _widthParser4.unit,
            parsedWidth = _widthParser4.parsedWidth;

        if (unit === '%') {
          return 100 * parsedWidth / groupWidth + 'px';
        }
        return '' + parsedWidth + unit;
      };

      var classesName = this.getColumnClass() + ' outlook-group-fix';

      if (this.getAttribute('css-class')) {
        classesName += ' ' + this.getAttribute('css-class');
      }

      return '\n      <div\n        ' + this.htmlAttributes({
        class: classesName,
        style: 'div'
      }) + '\n      >\n        <!--[if mso | IE]>\n        <table  role="presentation" border="0" cellpadding="0" cellspacing="0">\n          <tr>\n        <![endif]-->\n          ' + this.renderChildren(children, {
        attributes: { mobileWidth: 'mobileWidth' },
        renderer: function renderer(component) {
          return component.constructor.isRawElement() ? component.render() : '\n              <!--[if mso | IE]>\n              <td\n                ' + component.htmlAttributes({
            style: {
              align: component.getAttribute('align'),
              'vertical-align': component.getAttribute('vertical-align'),
              width: getElementWidth(component.getWidthAsPixel ? component.getWidthAsPixel() : component.getAttribute('width'))
            }
          }) + '\n              >\n              <![endif]-->\n                ' + component.render() + '\n              <!--[if mso | IE]>\n              </td>\n              <![endif]-->\n          ';
        }
      }) + '\n        <!--[if mso | IE]>\n          </tr>\n          </table>\n        <![endif]-->\n      </div>\n    ';
    }
  }]);

  return MjGroup;
}(BodyComponent), _class$l.allowedAttributes = {
  'background-color': 'color',
  direction: 'enum(ltr,rtl)',
  'vertical-align': 'enum(top,bottom,middle)',
  width: 'unit(px,%)'
}, _class$l.defaultAttributes = {
  direction: 'ltr'
}, _temp$i);

var _class$m, _temp2$3;

var MjImage = (_temp2$3 = _class$m = function (_BodyComponent) {
  _inherits(MjImage, _BodyComponent);

  function MjImage() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, MjImage);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = MjImage.__proto__ || _Object$getPrototypeOf(MjImage)).call.apply(_ref, [this].concat(args))), _this), _this.headStyle = function (breakpoint) {
      return '\n    @media only screen and (max-width:' + breakpoint + ') {\n      table.full-width-mobile { width: 100% !important; }\n      td.full-width-mobile { width: auto !important; }\n    }\n  ';
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(MjImage, [{
    key: 'getStyles',
    value: function getStyles() {
      var width = this.getContentWidth();
      var fullWidth = this.getAttribute('full-width') === 'full-width';

      var _widthParser = widthParser(width),
          parsedWidth = _widthParser.parsedWidth,
          unit = _widthParser.unit;

      return {
        img: {
          border: this.getAttribute('border'),
          'border-left': this.getAttribute('left'),
          'border-right': this.getAttribute('right'),
          'border-top': this.getAttribute('top'),
          'border-bottom': this.getAttribute('bottom'),
          'border-radius': this.getAttribute('border-radius'),
          display: 'block',
          outline: 'none',
          'text-decoration': 'none',
          height: this.getAttribute('height'),
          'max-height': this.getAttribute('max-height'),
          'min-width': fullWidth ? '100%' : null,
          width: '100%',
          'max-width': fullWidth ? '100%' : null,
          'font-size': this.getAttribute('font-size')
        },
        td: {
          width: fullWidth ? null : '' + parsedWidth + unit
        },
        table: {
          'min-width': fullWidth ? '100%' : null,
          'max-width': fullWidth ? '100%' : null,
          width: fullWidth ? '' + parsedWidth + unit : null,
          'border-collapse': 'collapse',
          'border-spacing': '0px'
        }
      };
    }
  }, {
    key: 'getContentWidth',
    value: function getContentWidth() {
      var width = this.getAttribute('width') ? parseInt(this.getAttribute('width'), 10) : Infinity;

      var _getBoxWidths = this.getBoxWidths(),
          box = _getBoxWidths.box;

      return min([box, width]);
    }
  }, {
    key: 'renderImage',
    value: function renderImage() {
      var height = this.getAttribute('height');

      var img = '\n      <img\n        ' + this.htmlAttributes({
        alt: this.getAttribute('alt'),
        height: height && (height === 'auto' ? height : parseInt(height, 10)),
        src: this.getAttribute('src'),
        srcset: this.getAttribute('srcset'),
        style: 'img',
        title: this.getAttribute('title'),
        width: this.getContentWidth()
      }) + '\n      />\n    ';

      if (this.getAttribute('href')) {
        return '\n        <a\n          ' + this.htmlAttributes({
          href: this.getAttribute('href'),
          target: this.getAttribute('target'),
          rel: this.getAttribute('rel'),
          name: this.getAttribute('name')
        }) + '\n        >\n          ' + img + '\n        </a>\n      ';
      }

      return img;
    }
  }, {
    key: 'render',
    value: function render() {
      return '\n      <table\n        ' + this.htmlAttributes({
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation',
        style: 'table',
        class: this.getAttribute('fluid-on-mobile') ? 'full-width-mobile' : null
      }) + '\n      >\n        <tbody>\n          <tr>\n            <td ' + this.htmlAttributes({
        style: 'td',
        class: this.getAttribute('fluid-on-mobile') ? 'full-width-mobile' : null
      }) + '>\n              ' + this.renderImage() + '\n            </td>\n          </tr>\n        </tbody>\n      </table>\n    ';
    }
  }]);

  return MjImage;
}(BodyComponent), _class$m.tagOmission = true, _class$m.allowedAttributes = {
  alt: 'string',
  href: 'string',
  name: 'string',
  src: 'string',
  srcset: 'string',
  title: 'string',
  rel: 'string',
  align: 'enum(left,center,right)',
  border: 'string',
  'border-bottom': 'string',
  'border-left': 'string',
  'border-right': 'string',
  'border-top': 'string',
  'border-radius': 'unit(px,%){1,4}',
  'container-background-color': 'color',
  'fluid-on-mobile': 'boolean',
  padding: 'unit(px,%){1,4}',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  target: 'string',
  width: 'unit(px)',
  height: 'unit(px,auto)',
  'max-height': 'unit(px,%)',
  'font-size': 'unit(px)'
}, _class$m.defaultAttributes = {
  align: 'center',
  border: '0',
  height: 'auto',
  padding: '10px 25px',
  target: '_blank',
  'font-size': '13px'
}, _temp2$3);

var _class$n, _temp$j;

var MjRaw = (_temp$j = _class$n = function (_BodyComponent) {
  _inherits(MjRaw, _BodyComponent);

  function MjRaw() {
    _classCallCheck(this, MjRaw);

    return _possibleConstructorReturn(this, (MjRaw.__proto__ || _Object$getPrototypeOf(MjRaw)).apply(this, arguments));
  }

  _createClass(MjRaw, [{
    key: 'render',
    value: function render() {
      return this.getContent();
    }
  }]);

  return MjRaw;
}(BodyComponent), _class$n.endingTag = true, _class$n.rawElement = true, _temp$j);

var _class$o, _temp2$4;

var makeBackgroundString$1 = fp.flow(fp.filter(fp.identity), fp.join(' '));
var MjSection = (_temp2$4 = _class$o = function (_BodyComponent) {
  _inherits(MjSection, _BodyComponent);

  function MjSection() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, MjSection);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = MjSection.__proto__ || _Object$getPrototypeOf(MjSection)).call.apply(_ref, [this].concat(args))), _this), _this.getBackground = function () {
      return makeBackgroundString$1([_this.getAttribute('background-color')].concat(_toConsumableArray(_this.hasBackground() ? ['url(' + _this.getAttribute('background-url') + ')', 'top center / ' + _this.getAttribute('background-size'), _this.getAttribute('background-repeat')] : [])));
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(MjSection, [{
    key: 'getChildContext',
    value: function getChildContext() {
      var _getBoxWidths = this.getBoxWidths(),
          box = _getBoxWidths.box;

      return _extends({}, this.context, {
        containerWidth: box + 'px'
      });
    }
  }, {
    key: 'getStyles',
    value: function getStyles() {
      var containerWidth = this.context.containerWidth;


      var fullWidth = this.isFullWidth();

      var background = this.getAttribute('background-url') ? { background: this.getBackground() } : {
        background: this.getAttribute('background-color'),
        'background-color': this.getAttribute('background-color')
      };

      return {
        tableFullwidth: _extends({}, fullWidth ? background : {}, {
          width: '100%',
          'border-radius': this.getAttribute('border-radius')
        }),
        table: _extends({}, fullWidth ? {} : background, {
          width: '100%',
          'border-radius': this.getAttribute('border-radius')
        }),
        td: {
          border: this.getAttribute('border'),
          'border-bottom': this.getAttribute('border-bottom'),
          'border-left': this.getAttribute('border-left'),
          'border-right': this.getAttribute('border-right'),
          'border-top': this.getAttribute('border-top'),
          direction: this.getAttribute('direction'),
          'font-size': '0px',
          padding: this.getAttribute('padding'),
          'padding-bottom': this.getAttribute('padding-bottom'),
          'padding-left': this.getAttribute('padding-left'),
          'padding-right': this.getAttribute('padding-right'),
          'padding-top': this.getAttribute('padding-top'),
          'text-align': this.getAttribute('text-align')
        },
        div: _extends({}, fullWidth ? {} : background, {
          margin: '0px auto',
          'border-radius': this.getAttribute('border-radius'),
          'max-width': containerWidth
        }),
        innerDiv: {
          'line-height': '0',
          'font-size': '0'
        }
      };
    }
  }, {
    key: 'hasBackground',
    value: function hasBackground() {
      return this.getAttribute('background-url') != null;
    }
  }, {
    key: 'isFullWidth',
    value: function isFullWidth() {
      return this.getAttribute('full-width') === 'full-width';
    }
  }, {
    key: 'renderBefore',
    value: function renderBefore() {
      var containerWidth = this.context.containerWidth;


      return '\n      <!--[if mso | IE]>\n      <table\n        ' + this.htmlAttributes({
        align: 'center',
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        class: suffixCssClasses(this.getAttribute('css-class'), 'outlook'),
        style: { width: '' + containerWidth },
        width: parseInt(containerWidth, 10)
      }) + '\n      >\n        <tr>\n          <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">\n      <![endif]-->\n    ';
    }

    // eslint-disable-next-line class-methods-use-this

  }, {
    key: 'renderAfter',
    value: function renderAfter() {
      return '\n      <!--[if mso | IE]>\n          </td>\n        </tr>\n      </table>\n      <![endif]-->\n    ';
    }
  }, {
    key: 'renderWrappedChildren',
    value: function renderWrappedChildren() {
      var children = this.props.children;


      return '\n      <!--[if mso | IE]>\n        <tr>\n      <![endif]-->\n      ' + this.renderChildren(children, {
        renderer: function renderer(component) {
          return component.constructor.isRawElement() ? component.render() : '\n          <!--[if mso | IE]>\n            <td\n              ' + component.htmlAttributes({
            align: component.getAttribute('align'),
            class: suffixCssClasses(component.getAttribute('css-class'), 'outlook'),
            style: 'tdOutlook'
          }) + '\n            >\n          <![endif]-->\n            ' + component.render() + '\n          <!--[if mso | IE]>\n            </td>\n          <![endif]-->\n    ';
        }
      }) + '\n\n      <!--[if mso | IE]>\n        </tr>\n      <![endif]-->\n    ';
    }
  }, {
    key: 'renderWithBackground',
    value: function renderWithBackground(content) {
      var fullWidth = this.isFullWidth();

      var containerWidth = this.context.containerWidth;


      return '\n      <!--[if mso | IE]>\n        <v:rect ' + this.htmlAttributes({
        style: fullWidth ? { 'mso-width-percent': '1000' } : { width: containerWidth },
        'xmlns:v': 'urn:schemas-microsoft-com:vml',
        fill: 'true',
        stroke: 'false'
      }) + '>\n        <v:fill ' + this.htmlAttributes({
        origin: '0.5, 0',
        position: '0.5, 0',
        src: this.getAttribute('background-url'),
        color: this.getAttribute('background-color'),
        type: 'tile'
      }) + ' />\n        <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">\n      <![endif]-->\n          ' + content + '\n        <!--[if mso | IE]>\n        </v:textbox>\n      </v:rect>\n    <![endif]-->\n    ';
    }
  }, {
    key: 'renderSection',
    value: function renderSection() {
      var hasBackground = this.hasBackground();

      return '\n      <div ' + this.htmlAttributes({
        class: this.isFullWidth() ? null : this.getAttribute('css-class'),
        style: 'div'
      }) + '>\n        ' + (hasBackground ? '<div ' + this.htmlAttributes({ style: 'innerDiv' }) + '>' : '') + '\n        <table\n          ' + this.htmlAttributes({
        align: 'center',
        background: this.isFullWidth() ? null : this.getAttribute('background-url'),
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation',
        style: 'table'
      }) + '\n        >\n          <tbody>\n            <tr>\n              <td\n                ' + this.htmlAttributes({
        style: 'td'
      }) + '\n              >\n                <!--[if mso | IE]>\n                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">\n                <![endif]-->\n                  ' + this.renderWrappedChildren() + '\n                <!--[if mso | IE]>\n                  </table>\n                <![endif]-->\n              </td>\n            </tr>\n          </tbody>\n        </table>\n        ' + (hasBackground ? '</div>' : '') + '\n      </div>\n    ';
    }
  }, {
    key: 'renderFullWidth',
    value: function renderFullWidth() {
      var content = this.hasBackground() ? this.renderWithBackground('\n        ' + this.renderBefore() + '\n        ' + this.renderSection() + '\n        ' + this.renderAfter() + '\n      ') : '\n        ' + this.renderBefore() + '\n        ' + this.renderSection() + '\n        ' + this.renderAfter() + '\n      ';

      return '\n      <table\n        ' + this.htmlAttributes({
        align: 'center',
        class: this.getAttribute('css-class'),
        background: this.getAttribute('background-url'),
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation',
        style: 'tableFullwidth'
      }) + '\n      >\n        <tbody>\n          <tr>\n            <td>\n              ' + content + '\n            </td>\n          </tr>\n        </tbody>\n      </table>\n    ';
    }
  }, {
    key: 'renderSimple',
    value: function renderSimple() {
      var section = this.renderSection();

      return '\n      ' + this.renderBefore() + '\n      ' + (this.hasBackground() ? this.renderWithBackground(section) : section) + '\n      ' + this.renderAfter() + '\n    ';
    }
  }, {
    key: 'render',
    value: function render() {
      return this.isFullWidth() ? this.renderFullWidth() : this.renderSimple();
    }
  }]);

  return MjSection;
}(BodyComponent), _class$o.allowedAttributes = {
  'background-color': 'color',
  'background-url': 'string',
  'background-repeat': 'enum(repeat,no-repeat)',
  'background-size': 'string',
  border: 'string',
  'border-bottom': 'string',
  'border-left': 'string',
  'border-radius': 'string',
  'border-right': 'string',
  'border-top': 'string',
  direction: 'enum(ltr,rtl)',
  'full-width': 'enum(full-width)',
  padding: 'unit(px,%){1,4}',
  'padding-top': 'unit(px,%)',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'text-align': 'enum(left,center,right)',
  'text-padding': 'unit(px,%){1,4}'
}, _class$o.defaultAttributes = {
  'background-repeat': 'repeat',
  'background-size': 'auto',
  direction: 'ltr',
  padding: '20px 0',
  'text-align': 'center',
  'text-padding': '4px 4px 4px 0'
}, _temp2$4);

var _class$p, _temp$k;

var MjSpacer = (_temp$k = _class$p = function (_BodyComponent) {
  _inherits(MjSpacer, _BodyComponent);

  function MjSpacer() {
    _classCallCheck(this, MjSpacer);

    return _possibleConstructorReturn(this, (MjSpacer.__proto__ || _Object$getPrototypeOf(MjSpacer)).apply(this, arguments));
  }

  _createClass(MjSpacer, [{
    key: 'getStyles',
    value: function getStyles() {
      return {
        div: {
          height: this.getAttribute('height')
        }
      };
    }
  }, {
    key: 'render',
    value: function render() {
      var height = this.getAttribute('height');

      return '\n      ' + conditionalTag('\n        <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td height="' + parseInt(height, 10) + '" style="vertical-align:top;height:' + height + ';">\n      ') + '\n      <div\n        ' + this.htmlAttributes({
        style: 'div'
      }) + '\n      >\n        &nbsp;\n      </div>\n      ' + conditionalTag('\n        </td></tr></table>\n      ') + '\n    ';
    }
  }]);

  return MjSpacer;
}(BodyComponent), _class$p.allowedAttributes = {
  border: 'string',
  'border-bottom': 'string',
  'border-left': 'string',
  'border-right': 'string',
  'border-top': 'string',
  'container-background-color': 'color',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  padding: 'unit(px,%){1,4}',
  'vertical-align': 'enum(top,bottom,middle)',
  width: 'unit(px,%)',
  height: 'unit(px,%)'
}, _class$p.defaultAttributes = {
  height: '20px'
}, _temp$k);

var _class$q, _temp$l;

var MjText = (_temp$l = _class$q = function (_BodyComponent) {
  _inherits(MjText, _BodyComponent);

  function MjText() {
    _classCallCheck(this, MjText);

    return _possibleConstructorReturn(this, (MjText.__proto__ || _Object$getPrototypeOf(MjText)).apply(this, arguments));
  }

  _createClass(MjText, [{
    key: 'getStyles',
    value: function getStyles() {
      return {
        text: {
          'font-family': this.getAttribute('font-family'),
          'font-size': this.getAttribute('font-size'),
          'font-style': this.getAttribute('font-style'),
          'font-weight': this.getAttribute('font-weight'),
          'letter-spacing': this.getAttribute('letter-spacing'),
          'line-height': this.getAttribute('line-height'),
          'text-align': this.getAttribute('align'),
          'text-decoration': this.getAttribute('text-decoration'),
          'text-transform': this.getAttribute('text-transform'),
          color: this.getAttribute('color'),
          height: this.getAttribute('height')
        }
      };
    }
  }, {
    key: 'renderContent',
    value: function renderContent() {
      return '\n      <div\n        ' + this.htmlAttributes({
        style: 'text'
      }) + '\n      >' + this.getContent() + '</div>\n    ';
    }
  }, {
    key: 'render',
    value: function render() {
      var height = this.getAttribute('height');

      return height ? '\n        ' + conditionalTag('\n          <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td height="' + height + '" style="vertical-align:top;height:' + height + ';">\n        ') + '\n        ' + this.renderContent() + '\n        ' + conditionalTag('\n          </td></tr></table>\n        ') + '\n      ' : this.renderContent();
    }
  }]);

  return MjText;
}(BodyComponent), _class$q.endingTag = true, _class$q.allowedAttributes = {
  align: 'enum(left,right,center,justify)',
  'background-color': 'color',
  color: 'color',
  'container-background-color': 'color',
  'font-family': 'string',
  'font-size': 'unit(px)',
  'font-style': 'string',
  'font-weight': 'string',
  height: 'unit(px,%)',
  'letter-spacing': 'unit(px,%)',
  'line-height': 'unit(px,%,)',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  padding: 'unit(px,%){1,4}',
  'text-decoration': 'string',
  'text-transform': 'string',
  'vertical-align': 'enum(top,bottom,middle)'
}, _class$q.defaultAttributes = {
  align: 'left',
  color: '#000000',
  'font-family': 'Ubuntu, Helvetica, Arial, sans-serif',
  'font-size': '13px',
  'line-height': '1',
  padding: '10px 25px'
}, _temp$l);

var _class$r, _temp$m;

var MjTable = (_temp$m = _class$r = function (_BodyComponent) {
  _inherits(MjTable, _BodyComponent);

  function MjTable() {
    _classCallCheck(this, MjTable);

    return _possibleConstructorReturn(this, (MjTable.__proto__ || _Object$getPrototypeOf(MjTable)).apply(this, arguments));
  }

  _createClass(MjTable, [{
    key: 'getStyles',
    value: function getStyles() {
      return {
        table: {
          color: this.getAttribute('color'),
          'font-family': this.getAttribute('font-family'),
          'font-size': this.getAttribute('font-size'),
          'line-height': this.getAttribute('line-height'),
          'table-layout': this.getAttribute('table-layout'),
          width: this.getAttribute('width'),
          border: this.getAttribute('border')
        }
      };
    }
  }, {
    key: 'getWidth',
    value: function getWidth() {
      var width = this.getAttribute('width');

      var _widthParser = widthParser(width),
          parsedWidth = _widthParser.parsedWidth,
          unit = _widthParser.unit;

      return unit === '%' ? width : parsedWidth;
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var tableAttributes = _.reduce(['cellpadding', 'cellspacing'], function (acc, v) {
        return _extends({}, acc, _defineProperty({}, v, _this2.getAttribute(v)));
      }, {});

      return '\n      <table\n        ' + this.htmlAttributes(_extends({}, tableAttributes, {
        width: this.getWidth(),
        border: '0',
        style: 'table'
      })) + '\n      >\n        ' + this.getContent() + '\n      </table>\n    ';
    }
  }]);

  return MjTable;
}(BodyComponent), _class$r.endingTag = true, _class$r.allowedAttributes = {
  align: 'enum(left,right,center)',
  border: 'string',
  cellpadding: 'integer',
  cellspacing: 'integer',
  'container-background-color': 'color',
  color: 'color',
  'font-family': 'string',
  'font-size': 'unit(px)',
  'font-weight': 'string',
  'line-height': 'unit(px,%,)',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  padding: 'unit(px,%){1,4}',
  'table-layout': 'enum(auto,fixed,initial,inherit)',
  'vertical-align': 'enum(top,bottom,middle)',
  width: 'unit(px,%)'
}, _class$r.defaultAttributes = {
  align: 'left',
  border: 'none',
  cellpadding: '0',
  cellspacing: '0',
  color: '#000000',
  'font-family': 'Ubuntu, Helvetica, Arial, sans-serif',
  'font-size': '13px',
  'line-height': '22px',
  padding: '10px 25px',
  'table-layout': 'auto',
  width: '100%'
}, _temp$m);

var MjWrapper = function (_MjSection) {
  _inherits(MjWrapper, _MjSection);

  function MjWrapper() {
    _classCallCheck(this, MjWrapper);

    return _possibleConstructorReturn(this, (MjWrapper.__proto__ || _Object$getPrototypeOf(MjWrapper)).apply(this, arguments));
  }

  _createClass(MjWrapper, [{
    key: 'renderWrappedChildren',
    value: function renderWrappedChildren() {
      var children = this.props.children;
      var containerWidth = this.context.containerWidth;


      return '\n      ' + this.renderChildren(children, {
        renderer: function renderer(component) {
          return component.constructor.isRawElement() ? component.render() : '\n          <!--[if mso | IE]>\n            <tr>\n              <td\n                ' + component.htmlAttributes({
            align: component.getAttribute('align'),
            class: suffixCssClasses(component.getAttribute('css-class'), 'outlook'),
            width: containerWidth
          }) + '\n              >\n          <![endif]-->\n            ' + component.render() + '\n          <!--[if mso | IE]>\n              </td>\n            </tr>\n          <![endif]-->\n        ';
        }
      }) + '\n    ';
    }
  }]);

  return MjWrapper;
}(MjSection);

var Dependencies = {
  mjml: ['mj-body', 'mj-head', 'mj-raw'],
  'mj-accordion': ['mj-accordion-element', 'mj-raw'],
  'mj-accordion-element': ['mj-accordion-title', 'mj-accordion-text', 'mj-raw'],
  'mj-accordion-title': [],
  'mj-accordion-text': [],
  'mj-attributes': [/^.*^/],
  'mj-body': ['mj-raw', 'mj-section', 'mj-wrapper', 'mj-hero'],
  'mj-button': [],
  'mj-carousel': ['mj-carousel-image'],
  'mj-carousel-image': [],
  'mj-column': ['mj-accordion', 'mj-button', 'mj-carousel', 'mj-divider', 'mj-html', 'mj-image', 'mj-invoice', 'mj-list', 'mj-location', 'mj-raw', 'mj-social', 'mj-spacer', 'mj-table', 'mj-text', 'mj-navbar'],
  'mj-divider': [],
  'mj-group': ['mj-column', 'mj-raw'],
  'mj-head': ['mj-attributes', 'mj-breakpoint', 'mj-font', 'mj-preview', 'mj-style', 'mj-title', 'mj-raw'],
  'mj-hero': ['mj-accordion', 'mj-button', 'mj-carousel', 'mj-divider', 'mj-html', 'mj-image', 'mj-list', 'mj-location', 'mj-social', 'mj-spacer', 'mj-table', 'mj-text', 'mj-navbar', 'mj-raw'],
  'mj-html': [],
  'mj-image': [],
  'mj-invoice': ['mj-invoice-item'],
  'mj-invoice-item': [],
  'mj-link': [],
  'mj-list': [],
  'mj-location': [],
  'mj-navbar': ['mj-navbar-link', 'mj-raw'],
  'mj-raw': [],
  'mj-section': ['mj-column', 'mj-group', 'mj-raw'],
  'mj-social': ['mj-social-element'],
  'mj-social-element': [],
  'mj-spacer': [],
  'mj-table': [],
  'mj-text': [],
  'mj-wrapper': ['mj-hero', 'mj-raw', 'mj-section']
};

registerComponent(MjBody);
registerComponent(MjHead);
registerComponent(MjAttributes);
registerComponent(MjBreakpoint);
registerComponent(MjFont);
registerComponent(MjPreview);
registerComponent(MjStyle);
registerComponent(MjTitle);
registerComponent(MjHero);
registerComponent(MjButton);
registerComponent(MjColumn);
registerComponent(MjDivider);
registerComponent(MjGroup);
registerComponent(MjImage);
registerComponent(MjRaw);
registerComponent(MjSection);
registerComponent(MjSpacer);
registerComponent(MjText);
registerComponent(MjTable);
registerComponent(MjWrapper);

registerComponent(MjSocial);
registerComponent(MjSocialElement);
registerComponent(MjNavbar);
registerComponent(MjNavbarLink);
registerComponent(MjAccordion);
registerComponent(MjAccordionElement);
registerComponent(MjAccordionText);
registerComponent(MjAccordionTitle);
registerComponent(MjCarousel);
registerComponent(MjCarouselImage);

registerDependencies(Dependencies);

module.exports = mjml2html;
