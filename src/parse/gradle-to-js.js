/* jshint node: true */
'use strict';
const stream = require('stream');
const fs = require('fs');
const chalk = require("chalk");
const _ = require('underscore');

const CHAR_NEWLINE = 10;
const CHAR_SPACE = 32;
const CHAR_DOUBLE_QUOTE = 34;
const CHAR_SINGLE_QUOTE = 39;
const CHAR_LEFT_PARENTHESIS = 40;
const CHAR_RIGHT_PARENTHESIS = 41;
const CHAR_SLASH = 47;
const CHAR_EQUALS = 61;
const CHAR_ARRAY_START = 91;
const CHAR_ARRAY_END = 93;
const CHAR_BLOCK_START = 123;
const CHAR_BLOCK_END = 125;

const KEYWORD_DEF = 'def';
const KEYWORD_IF = 'if';

const WHITESPACE_CHARACTERS = {};
WHITESPACE_CHARACTERS[CHAR_NEWLINE] = true;
WHITESPACE_CHARACTERS[CHAR_SPACE] = true;

const SPECIAL_KEYS = {
    repositories: parseRepositoryClosure,
    // buildConfigField: parseBuildConfigField
};

function parseBuildConfigField (chunk, state) {
    // 跳过buildConfigField关键字
    while (state.index < chunk.length && chunk[state.index] !== CHAR_SPACE) {
        state.index++;
    }

    // 跳过空格
    while (state.index < chunk.length && chunk[state.index] === CHAR_SPACE) {
        state.index++;
    }

    // 跳过类型和字段名
    skipFunctionCall(chunk, state); // 这里假设类型和字段名后面不会有其他非空格字符
    while (state.index < chunk.length && chunk[state.index] === CHAR_SPACE) {
        state.index++;
    }

    // 解析值
    let value = '';
    let inQuotes = false;
    while (state.index < chunk.length) {
        let char = chunk[state.index];
        if (char === CHAR_DOUBLE_QUOTE || char === CHAR_SINGLE_QUOTE) {
            inQuotes = !inQuotes;
        } else if (char === CHAR_NEWLINE && !inQuotes) {
            break;
        }
        value += String.fromCharCode(char);
        state.index++;
    }

    // 解析出的值可能包含转义字符，需要进行反转义处理
    value = value.replace(/\\"/g, '"');
    value = value.replace(/\\\\/g, '\\');

    return value.trim();
}

function parseRepositoryClosure(chunk, state) {
    const out = [];
    const repository = deepParse(chunk, state, true);
    Object.keys(repository).map(function (item) {
        if (repository[item]) {
            out.push({type: item, data: repository[item]});
        } else {
            out.push({type: 'unknown', data: {name: item}});
        }
    });
    return out;
}

function isWhitespace(str) {
    return WHITESPACE_CHARACTERS.hasOwnProperty(str);
}

function isStartOfComment(comment) {
    return comment === '/*' || comment === '//';
}

function isSingleLineComment(comment) {
    return comment === '//';
}

function isEndOfMultiLineComment(comment) {
    return comment.indexOf('*/') !== -1;
}

function parse (readableStream) {
    return new Promise((resolve, reject) => {
        let out = {};
        readableStream.on('data', (chunk) => {
           const state = {
               index: 0,
               comment: {
                   parsing: false,
                   singleLine: false,
                   multiLine: false,
                   setSingleLine : function () {
                       this._setCommentState(true, false);
                   },
                   setMultiLine : function () {
                       this._setCommentState(false, true);
                   },
                   reset : function () {
                       this._setCommentState(false, false);
                   },
                   _setCommentState: function (singleLine, multiLine) {
                       this.singleLine = singleLine;
                       this.multiLine = multiLine;
                       this.parsing = singleLine || multiLine;
                   }
               }
           };
           out = deepParse(chunk, state, false);
        });

        readableStream.on('end', (chunk) => {
            resolve(out);
        })

        readableStream.on('error', (err) => {
            reject('Error parsing stream: ' + err);
        });
    })
}

function skipFunctionCall (chunk, state) {
    let openParenthesisCount = 0;
    let character = '';

    for (let max = chunk.length; state.index < max; state.index++) {
        character = chunk[state.index];
        if (character === CHAR_LEFT_PARENTHESIS) {
            openParenthesisCount++;
        } else if (character === CHAR_RIGHT_PARENTHESIS) {
            openParenthesisCount--;
        }

        if (openParenthesisCount === 0) {
            break;
        }
    }

    return openParenthesisCount === 0;
}

function addValueToStructure(structure, currentKey, value) {
    if (currentKey) {
        if (structure.hasOwnProperty(currentKey)) {
            if (structure[currentKey].constructor === Array) {
                structure[currentKey].push(getRealValue(value));
            } else {
                const oldValue = structure[currentKey];
                structure[currentKey] = [oldValue, getRealValue(value)];
            }
        } else {
            structure[currentKey] = getRealValue(value);
        }
    }
}

function getRealValue(value) {
    if (value === 'true' || value === 'false') { // booleans
        return value === 'true';
    }

    return value;
}

function trimWrappingQuotes(string) {
    const st1 = string;
    const firstCharacter = string.slice(0, 1);
    //if (firstCharacter === '"') {
    //    return string.replace(/^"([^"]+)"$/g, '$1');
    //} else if (firstCharacter === '\'') {
    //    return string.replace(/^'([^']+)'$/g, '$1');
    //}
    // console.log(st1,"#",string);
    return string;
}

function parseArray(chunk, state) {
    let character = 0;
    let temp = '';
    for (let max = chunk.length; state.index < max; state.index++) {
        character = chunk[state.index];
        if (character === CHAR_ARRAY_START) {
            continue;
        } else if (character === CHAR_ARRAY_END) {
            break;
        }
        temp += String.fromCharCode(character);
    }

    return temp.split(',').map(function (item) {
        return trimWrappingQuotes(item.trim());
    });
}

function isDelimiter(character) {
    return character === CHAR_SPACE || character === CHAR_EQUALS;
}

function isKeyword(character) {
    return character === KEYWORD_DEF || character === KEYWORD_IF;
}

function fetchDefinedName(chunk, state) {
    let character = 0;
    let temp = '';
    for (let max = chunk.length; state.index < max; state.index++) {
        character = chunk[state.index];

        if (character === CHAR_EQUALS) {
            break;
        }

        temp += String.fromCharCode(character);
    }
    const values = temp.trim().split(' ');
    return values[values.length - 1];
}

function skipIfBlock(chunk, state) {
    skipFunctionCall(chunk, state);

    let character = '';
    let hasFoundTheCurlyBraces = false;
    let curlyBraceCount = 0;
    for (let max = chunk.length; state.index < max; state.index++) {
        character = chunk[state.index];
        if (character === CHAR_BLOCK_START) {
            hasFoundTheCurlyBraces = true;
            curlyBraceCount++;
        } else if (character === CHAR_BLOCK_END) {
            curlyBraceCount--;
        }

        if (hasFoundTheCurlyBraces && curlyBraceCount === 0) {
            break;
        }
    }
    return curlyBraceCount === 0;
}

function deepParse (chunk, state, keepFunctionCalls) {
    let out = {};
    let chunkLength = chunk.length;
    let character = 0;
    let tempString = '';
    let commentText = '';

    let currentKey = '';
    let isParsingKey = true;
    let isBeginningOfLine = true;

    for (; state.index < chunkLength; state.index++) {
        character = chunk[state.index];

        if (isBeginningOfLine && isWhitespace(character)) {
            continue;
        }

        if (!state.comment.parsing && isBeginningOfLine && isStartOfComment(tempString)) {
            isBeginningOfLine = false;
            if (isSingleLineComment(tempString)) {
                state.comment.setSingleLine();
            } else {
                state.comment.setMultiLine();
            }
            continue;
        }

        if (state.comment.multiLine && isEndOfMultiLineComment(commentText)) {
            state.comment.reset();

            isBeginningOfLine = true;
            tempString = '';
            commentText = '';
            continue;
        }

        if (state.comment.parsing && character !== CHAR_NEWLINE) {
            commentText += String.fromCharCode(character);
            continue;
        }

        if (state.comment.parsing && character === CHAR_SPACE) {
            if (state.comment.singleLine) {
                state.comment.reset();
                isBeginningOfLine = true;

                currentKey = '';
                tempString = '';
                commentText = '';
                continue;
            } else {
                continue;
            }
        }

        if (isParsingKey && !keepFunctionCalls && character === CHAR_LEFT_PARENTHESIS) {
            skipFunctionCall(chunk, state);
            currentKey = '';
            tempString = '';
            continue;
        }

        if (character === CHAR_NEWLINE) {
            if (!currentKey && tempString) {
                currentKey = tempString;
                tempString = '';
            }
            addValueToStructure(out, currentKey, trimWrappingQuotes(tempString));

            currentKey = '';
            tempString = '';
            isParsingKey = true;
            isBeginningOfLine = true;

            state.comment.reset();
            continue;
        }

        if (!isParsingKey && !tempString && character === CHAR_ARRAY_START) {
            out[currentKey] = parseArray(chunk, state);
            currentKey = '';
            tempString = '';
            continue;
        }

        if (character === CHAR_BLOCK_START) {
            state.index++;

            if (SPECIAL_KEYS.hasOwnProperty(currentKey)) {
                out[currentKey] = SPECIAL_KEYS[currentKey](chunk, state);
            } else {
                out[currentKey] = deepParse(chunk, state, keepFunctionCalls);
            }
            currentKey = '';
        } else if (character === CHAR_BLOCK_END) {
            currentKey = '';
            tempString = '';
            break;
        } else if (isDelimiter(character) && isParsingKey) {
            if (isKeyword(tempString)) {
                if (tempString === KEYWORD_DEF) {
                    tempString = fetchDefinedName(chunk, state);
                } else if (tempString === KEYWORD_IF) {
                    skipIfBlock(chunk, state);
                    currentKey = '';
                    tempString = '';
                    continue;
                }
            }
            currentKey = tempString;
            tempString = '';
            isParsingKey = false;
        } else {
            if (!tempString && isDelimiter(character)) {
                continue;
            }
            tempString += String.fromCharCode(character);
            isBeginningOfLine = isBeginningOfLine && (character === CHAR_SLASH || isStartOfComment(tempString));
        }
    }

    addValueToStructure(out, currentKey, trimWrappingQuotes(tempString));

    return out;
}

function recusiveTextConvert (obj, k) {
    let text = "";
    if (Array.isArray(obj)) {
        _.each(obj, function (o, key) {
            text += k + " " + recusiveTextConvert(o);
        })
    } else if (typeof obj === 'object' && obj !== null) {

        text += k ? k + "{\n" : ""
        _.each(obj, function (o, key) {
            text += recusiveTextConvert(o, key)
        })
        text += k ? "}\n" : ""
    } else {
        text += k ? k : ""
        text += " " + obj + "\n"
    }

    return text;
}

function makeGradleText (obj) {
    return recusiveTextConvert(obj);
}

function parseFile(filePath) {
    const stream = fs.createReadStream(filePath);
    return parse(stream);
}

module.exports = {
    parseFile: parseFile,
    makeGradleText: makeGradleText
}
