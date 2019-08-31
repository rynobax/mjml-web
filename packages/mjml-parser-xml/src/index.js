import htmlparser from 'htmlparser2'

import isObject from 'lodash/isObject'
import findLastIndex from 'lodash/findLastIndex'
import find from 'lodash/find'
import filter from 'lodash/fp/filter'
import map from 'lodash/fp/map'
import flow from 'lodash/fp/flow'

import cleanNode from './helpers/cleanNode'
import convertBooleansOnAttrs from './helpers/convertBooleansOnAttrs'
import setEmptyAttributes from './helpers/setEmptyAttributes'

const indexesForNewLine = xml => {
  const regex = /\n/gi
  const indexes = [0]

  while (regex.exec(xml)) {
    indexes.push(regex.lastIndex)
  }

  return indexes
}

const isSelfClosing = (indexes, parser) =>
  indexes.startIndex === parser.startIndex &&
  indexes.endIndex === parser.endIndex

export default function MJMLParser(xml, options = {}, includedIn = []) {
  const {
    addEmptyAttributes = true,
    components = {},
    convertBooleans = true,
    keepComments = true,
    filePath = '.',
    ignoreIncludes = false,
  } = options

  const endingTags = flow(
    filter(component => component.endingTag),
    map(component => component.getTagName()),
  )({ ...components })

  let mjml = null
  let cur = null
  let inInclude = !!includedIn.length
  let inEndingTag = 0
  const currentEndingTagIndexes = { startIndex: 0, endIndex: 0 }

  const lineIndexes = indexesForNewLine(xml)

  const parser = new htmlparser.Parser(
    {
      onopentag: (name, attrs) => {
        const isAnEndingTag = endingTags.indexOf(name) !== -1

        if (inEndingTag > 0) {
          if (isAnEndingTag) inEndingTag += 1
          return
        }

        if (isAnEndingTag) {
          inEndingTag += 1

          if (inEndingTag === 1) { // we're entering endingTag
            currentEndingTagIndexes.startIndex = parser.startIndex
            currentEndingTagIndexes.endIndex = parser.endIndex
          }
        }

        const line = findLastIndex(lineIndexes, i => i <= parser.startIndex) + 1

        if (name === 'mj-include' && !ignoreIncludes) {
          inInclude = true
          return
        }

        if (convertBooleans) {
          // "true" and "false" will be converted to bools
          attrs = convertBooleansOnAttrs(attrs)
        }

        const newNode = {
          file: filePath,
          absoluteFilePath: '',
          line,
          includedIn,
          parent: cur,
          tagName: name,
          attributes: attrs,
          children: [],
        }

        if (cur) {
          cur.children.push(newNode)
        } else {
          mjml = newNode
        }

        cur = newNode
      },
      onclosetag: name => {
        if (endingTags.indexOf(name) !== -1) {
          inEndingTag -= 1

          if (!inEndingTag) { // we're getting out of endingTag
            // if self-closing tag we don't get the content
            if (!isSelfClosing(currentEndingTagIndexes, parser)) {
              const partialVal = xml.substring(currentEndingTagIndexes.endIndex + 1, parser.endIndex).trim()
              const val = partialVal.substring(0, partialVal.lastIndexOf(`</${name}`))

              if (val) cur.content = val.trim()
            }
          }
        }

        if (inEndingTag > 0) return

        if (inInclude) {
          inInclude = false
        }
        
        // for includes, setting cur is handled in handleInclude because when there is
        // only mj-head in include it doesn't create any elements, so setting back to parent is wrong
        if (name !== 'mj-include') cur = (cur && cur.parent) || null
      },
      ontext: text => {
        if (inEndingTag > 0) return

        if (text && text.trim() && cur) {
          cur.content = `${(cur && cur.content) || ''}${text.trim()}`.trim()
        }
      },
      oncomment: data => {
        if (inEndingTag > 0) return

        if (cur && keepComments) {
          cur.children.push({
            line: findLastIndex(lineIndexes, i => i <= parser.startIndex) + 1,
            tagName: 'mj-raw',
            content: `<!-- ${data.trim()} -->`,
            includedIn,
          })
        }
      },
    },
    {
      recognizeCDATA: true,
      decodeEntities: false,
      recognizeSelfClosing: true,
      lowerCaseAttributeNames: false,
    },
  )

  parser.write(xml)
  parser.end()

  if (!isObject(mjml)) {
    throw new Error('Parsing failed. Check your mjml.')
  }

  cleanNode(mjml)

  // Assign "attributes" property if not set
  if (addEmptyAttributes) {
    setEmptyAttributes(mjml)
  }

  return mjml
}
