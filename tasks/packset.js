/*
 * grunt-packset
 * https://github.com/jinjianfeng/grunt-packset
 *
 * Copyright (c) 2014 jinjianfeng
 * Licensed under the MIT license.
 */

'use strict';
//用于css编辑编辑处理
var css = require('css');
//用户html编辑处理
var cheerio = require('cheerio');
//依赖path
var path = require('path');

module.exports = function(grunt) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  //处理css
   function handleCss(data) {
    var addRule = '';
    var rules = data.stylesheet.rules;
    //console.log(rules);
    for (var i = 0; i < rules.length; i++) {
      var declarations = rules[i].declarations;
      if (declarations != undefined) {
        for (var j = 0; j < declarations.length; j++) {
          //如果元素使用的是rem方案，则不做处理
          if (declarations[j].value.indexOf('rem') != -1) {
            continue;
          }
          //font size的追加
          if (declarations[j].property == 'font-size') {
            if (declarations[j].value.indexOf('rem') == -1) {
              var fontSize = Math.round(parseInt(declarations[j].value) / 2);
            }
            addRule += '[data-dpr="1"] ' + rules[i].selectors.join(',') + '{font-size:' + fontSize + 'px}';
          }
          var remElement = ['width', 'height', 'text-indent', 'line-height', 'left', 'top', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right'];
          var mulitElement = ['padding', 'margin'];
          var noNeedElement = ['text-indent'];
          if (noNeedElement.indexOf(declarations[j].property) != -1) {
            continue;
          }
          if (remElement.indexOf(declarations[j].property) != -1) {
            var w = Math.round(parseInt(declarations[j].value) * 100 / 40) / 100;
            declarations[j].value = w + 'rem';
          }
          if (mulitElement.indexOf(declarations[j].property) != -1) {
            var p = declarations[j].value && declarations[j].value.split(" ");
            var pArray = [];
            for (var k = 0; k < p.length; k++) {
              if (isNaN(parseInt(p[k]))) {
                pArray.push(p[k]);
              } else {
                var wsub = Math.round(parseInt(p[k]) * 100 / 40) / 100;
                pArray.push(wsub + 'rem');
              }
            }
            declarations[j].value = pArray.join(" ");
          }

        }
      }
    }
    return css.stringify(data) + addRule;
  }



  //通过class移除标签
  function removeTagsByClass($) {
    $('.J_WillRemoveAtBuild').remove();
  }
  //将mt标签修改成可执行
  function replaceMtTag($, destDir) {
    $('script').each(function(index, script) {
        var script = $(script);
        var src = script.attr('src');
        if (script.attr('type') == 'text/mt') {
          script.attr('type', "text/javascript");
      }
      //本地文件需要更改地址
      if (src && src.indexOf(":") == -1) {
        script.attr('src', path.basename(src));
      }
    });
  }

  function replaceCssTag($) {
    $('link').each(function(index, css) {
      var css = $(css);
      var href = css.attr('href');
      //本地文件需要更改地址
      if (href && href.indexOf(":") == -1) {
        css.attr('href', path.basename(href));
      }
    })
  }
  //处理spm标签
  function replaceSpmTagForMT($) {
    $('meta').each(function(index, meta) {
      var meta = $(meta);
      if (meta.attr('name') == 'data-spm') {
        meta.attr('content', "{{spm['A']}}");
      }
    });
    $('body').attr('data-spm', "{{spm['B']}}");
  }


  grunt.registerMultiTask('packset', 'The best Grunt plugin ever.', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      punctuation: '.',
      separator: ', '
    });

    // Iterate over all specified file groups.
    this.files.forEach(function(f) {
      // Concat specified files.
      var src = f.src.filter(function(filepath) {

        // Warn on and remove invalid source files (if nonull was set).
        if (!grunt.file.exists(filepath)) {
          grunt.log.warn('Source file "' + filepath + '" not found.');
          return false;
        } else {
          return true;
        }
      }).map(function(filepath) {
        var newCssString = '';
        var extname = path.extname(filepath);
        //html后缀
        if (options.htmlExt.indexOf(extname) != -1) {
          var html = grunt.file.read(filepath);
          var $ = cheerio.load(html,{
            decodeEntities:false
          });
          var destDir = f.orig.dest;
          removeTagsByClass($,destDir);
          // replaceSpmTagForMT($);
          replaceMtTag($,destDir);
          replaceCssTag($,destDir);

          grunt.file.write(f.dest, $.html().replace(/&apos;/gi, "'"));
          grunt.log.writeln('html File "' + f.dest + '" created.');
        }

        if (options.cssExt.indexOf(extname) != -1) {
          var html = grunt.file.read(filepath);
          var cssParse = css.parse(html);
          var newCss = handleCss(cssParse);
          grunt.file.write(f.dest, newCss);
          grunt.log.writeln('css File "' + f.dest + '" created.');
        }

      });

    });
  });

};