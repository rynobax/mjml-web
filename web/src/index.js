'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

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
var htmlMinifier = require('html-minifier');
var htmlparser = _interopDefault(require('htmlparser2'));
var isObject = _interopDefault(require('lodash/isObject'));
var findLastIndex = _interopDefault(require('lodash/findLastIndex'));
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
var find = _interopDefault(require('lodash/find'));
var escapeRegExp = _interopDefault(require('lodash/escapeRegExp'));
var _defineProperty = _interopDefault(require('babel-runtime/helpers/defineProperty'));

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
      keepComments = _options$keepComments === undefined ? true : _options$keepComments;


  var endingTags = flow(filter(function (component) {
    return component.endingTag;
  }), map(function (component) {
    return component.getTagName();
  }))(_extends({}, components));

  var mjml = null;
  var cur = null;
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

      if (convertBooleans) {
        // "true" and "false" will be converted to bools
        attrs = convertBooleansOnAttrs(attrs);
      }

      var newNode = {
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

var dependencies = {};

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

  if (typeof options.skeleton === 'string') {
    /* eslint-disable global-require */
    /* eslint-disable import/no-dynamic-require */
    options.skeleton = require(options.skeleton);
    /* eslint-enable global-require */
    /* eslint-enable import/no-dynamic-require */
  }

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
      minifyOptions = _options$minifyOption === undefined ? {} : _options$minifyOption,
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

  if (minify && minify !== 'false') {
    content = htmlMinifier.minify(content, _extends({
      collapseWhitespace: true,
      minifyCSS: false,
      caseSensitive: true,
      removeEmptyAttributes: true
    }, minifyOptions));
  }

  content = mergeOutlookConditionnals(content);

  return {
    html: content,
    errors: errors
  };
}

exports.BodyComponent = BodyComponent;
exports.HeadComponent = HeadComponent;
exports.components = components;
exports.default = mjml2html;
exports.initComponent = initComponent;
exports.initializeType = initializeType;
exports.registerComponent = registerComponent;
exports.suffixCssClasses = suffixCssClasses;
