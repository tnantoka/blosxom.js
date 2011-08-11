#!/usr/bin/env node

// blosxom.js: Clone of blosxom for node.js
// Author: tnantoka <bornneet@livedoor.com>
// Version: 1.0
// BSD License

/* Original */
/*
# Blosxom
# Author: Rael Dornfest <rael@oreilly.com>
# Version: 2.0
# Home/Docs/Licensing: http://www.raelity.org/apps/blosxom/
*/

// blosxom object exports for module
var blosxom = {};

// Load modules
var querystring = require('querystring');
var join = require('path').join;
var dirname = require('path').dirname;
var fs = require('fs');

var QUERY = querystring.parse(process.env.QUERY_STRING) || {};
var DATA = __DATA__();

// CGI(Dynamic)
if (process.env.GATEWAY_INTERFACE) {

  // Receive HTTP body data before main processing
  var BODY = [];
  process.stdin.resume();
  process.stdin.setEncoding('UTF-8');
  process.stdin.on('data', function(chunk) {
    BODY.push(chunk);
  });
  // Main
  process.stdin.on('end', main);

// CGI(Static)
} else {
  main();
}


function main() {

// for test
// log('');

try {

/* # --- Configurable variables ----- */

/* # What's this blog's title? */
var $blog_title = 'My Weblog';

/* # What's this blog's description (for outgoing RSS feed)? */
var blog_description = 'Yet another Blosxom weblog.';

/* # What's this blog's primary language (for outgoing RSS feed)? */
var blog_language = 'en';

/* # Where are this blog's entries kept? */
var datadir = __dirname + '/data';

/* # What's my preferred base URL for this blog (leave blank for automatic)? */
var $url = '';

/*
# Should I stick only to the datadir for items or travel down the
# directory hierarchy looking for items?  If so, to what depth?
# 0 = infinite depth (aka grab everything), 1 = datadir only, n = n levels down
*/
var depth = 0;

/* # How many entries should I show on the home page? */
var num_entries = 40;

/* # What file extension signifies a blosxom entry? */
var file_extension = 'txt';

/* # What is the default flavour? */
var default_flavour = 'html';

/* # Should I show entries from the future (i.e. dated after now)? */
var show_future_entries = 0;

/* # --- Plugins (Optional) ----- */

/* # Where are my plugins kept? */
var plugin_dir = __dirname + '/plugins';

/* # Where should my modules keep their state information? */
var plugin_state_dir = 'var plugin_dir/state';

/* # --- Static Rendering ----- */

/* # Where are this blog's static files to be created? */
var static_dir = __dirname + '/static';

/* # What's my administrative password (you must set this for static rendering)? */
var static_password = 'pass';

/* # What flavours should I generate statically? */
var static_flavours = ['html', 'rss'];

/*
# Should I statically generate individual entries?
# 0 = no, 1 = yes
*/
var static_entries = 0;

/* # -------------------------------- */

'use strict';

var version = "2.0";

var month2num = { nil: '00', Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
var num2month = { '00': 'nil', '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec' };

/* # Use the stated preferred URL or figure it out automatically */
$url = $url || 'http://' + process.env.HTTP_HOST + process.env.SCRIPT_NAME;
$url = $url.replace(/^included:/, 'http:'); /* # Fix for Server Side Includes (SSI) */
$url = $url.replace(/\/$/, '');

$css = {};
$css.path = require('path').dirname(process.env.SCRIPT_NAME) + '/style-sites.css';


/* # Drop ending any / from dir settings */
datadir = datadir.replace(/\/$/, '');
plugin_dir = plugin_dir.replace(/\/$/, '');
static_dir = static_dir.replace(/\/$/, '');

/* # Fix depth to take into account datadir's path */
if (depth) {
  depth += datadir.match(/\//g).length - 1;
}

/* # Global variable to be used in head/foot.{flavour} templates */
var path_info = '';

var static_or_dynamic = !process.env.GATEWAY_INTERFACE && process.argv[2] && static_password && process.argv[2].split('=')[1] == static_password ? 'static' : 'dynamic';
if (static_or_dynamic == 'dynamic') {
  QUERY['-quiet'] = 1;
}
// TEST
if (!process.env.GATEWAY_INTERFACE) {
//  QUERY.path = '/2011/05/15/';
}

/*
# Path Info Magic
# Take a gander at HTTP's PATH_INFO for optional blog name, archive yr/mo/day
*/
var paths = (process.env.PATH_INFO || QUERY.path || '').split('/');
paths.shift();

while (paths[0] && /^[a-zA-Z].*$/.test(paths[0]) && !/(.*)\.(.*)/.test(paths[0])) {
  path_info += '/' + paths.shift();
}

/* # Flavour specified by ?flav={flav} or index.{flav} */
var $flavour = '';

if (paths[paths.length - 1] && paths[paths.length - 1].match(/(.+)\.(.+)$/)) {
  $flavour = RegExp.$2;
  if (RegExp.$1 != 'index') {
    path_info += '/' + RegExp.$1 + '.' + RegExp.$2;
  }
  paths.pop();
} else {
  $flavour = QUERY.flav || default_flavour;
}

/* # Strip spurious slashes */
path_info = path_info.replace(/(^\/*)|(\/*$)/, '');

/* # Date fiddling */
var $path_info_yr = paths[0] || '';
var $path_info_mo = paths[1] || '';
var $path_info_da = paths[2] || '';
var path_info_mo_num = $path_info_mo ? (/\d{2}/.test($path_info_mo) ? $path_info_mo : (month2num[$path_info_mo.charAt(0).toUpperCase() + $path_info_mo.toLowerCase().slice(1)] || undefined) ) : undefined;

/* # Define standard template subroutine, plugin-overridable at Plugins: Template */
var template = function(path, chunk, flavour) {
  while (true) {
    try {
      var filename = join(datadir, path, chunk + '.' + flavour);
      if (fs.statSync(filename).isFile()) {
        return fs.readFileSync(filename, 'UTF-8');
      }
    } catch (e) {
    }
    var matches = path.match(/(\/*[^\/]*)$/);
    if (matches && matches[1]) {
      path = path.replace(/(\/*[^\/]*)$/, '');
    } else {
      break;
    }
  }
  return templates[flavour][chunk] || templates[error][chunk] || '';
};

// Load default template from DATA
var templates = {};
for (var i = 0; i < DATA.length; i++) {
  if (DATA[i] == '__END__') {
    break;
  }
  var matches = DATA[i].match(/^(\S+)\s(\S+)\s([\s\S]*)$/);
  var ct = matches[1];
  var comp = matches[2];
  var txt = matches[3];
  if (templates[ct]) {
    templates[ct][comp] = txt;
  } else {
    templates[ct] = {};
    templates[ct][comp] = txt;
  }
}

// exoprts for modules
blosxom.monthname = num2month;
blosxom.url = $url;


/* # Plugins: Start */
var plugins_hash = {};
var plugins_array = [];
var modules = {};
if (plugin_dir) {
  var plugs = fs.readdirSync(plugin_dir).sort();
  for (var i = 0; i < plugs.length; i++) {
    var matches = plugs[i].match(/^\d*(\w+?)(_?)$/);
    if (matches) {
      var plugin_name = matches[1];
      var on_off = matches[2] == '_' ? -1 : 1;
      modules[plugin_name] = require(join(plugin_dir, plugs[i]));
      if (modules[plugin_name].start(blosxom)) {
        plugins_hash[plugin_name] = on_off;
        plugins_array.push(plugin_name);
      }
    }
  }
}

/*
# Plugins: Template
# Allow for the first encountered plugin::template subroutine to override the
# default built-in template subroutin
*/
for (var i = 0; i < plugins_array.length; i++) {
  if (plugins_hash[plugins_array[i]] > 0 && modules[plugins_array[i]].templete) {
    templete = modules[plugins_array[i]].templete;
    break;
  }
}

/* # Provide backward compatibility for Blosxom < 2.0rc1 plug-ins */
load_template = template;

/* # Define default find subroutine */
var entries = function() {

  var files = {};
  var indexes = {};
  var others = {};

  var d;

  find(function(err, path, stat) {

    if (err) {
      throw err;
    }

    if (depth && dirname(path).match(/\//g).length > depth) {
      return;
    }

    /*
    # a match
    # not an index, .file, and is readable
    */
    // TODO: check readable
    var matches = path.match(new RegExp(['^', datadir, '/(?:(.*)/)?(.+)\\.', file_extension, '$'].join('')));
    if (matches && matches[2] != 'index' && !/^\./.test(matches[2])) {
      /* # to show or not to show future entries */
      if (show_future_entries || new Date(stat.mtime) < new Date()) {
        files[path] = stat.mtime;
      }

      /* # static rendering bits */
      // TODO: static
      var static_stat;
      try {
        static_stat = fs.statSync(static_dir + '/' + matches[1] + '/index.' + static_flavours[0]);
        if (QUERY['-all'] || static_stat.isFile() || static_stat.mtime < stat.mtime) {
          indexes[matches[1]] = 1;

          var nice = nice_date(stat.ctime);
          d = [nice[5], nice[2], nice[3]].join('/');

          indexes[d] = d;
          if (static_entries) {
            $indexes[(matches[1] ? matches[1] + '/' : '') + matches[2] + '.' + file_extension] = 1;
          }
        }
      } catch (e) {
      }
    } else {
      others[path] = stat.mtime;
    }
  }, datadir);

  function find(fn, path) {
    try {
      var stat = fs.statSync(path);

      if (stat.isDirectory()) {
        var files = fs.readdirSync(path);
        for(var i = 0; i < files.length; i++) {
          find(fn, join(path, files[i]));
        }
      } else if (stat.isFile()) {
        fn(null, path, stat);
      }
    } catch (e) {
      fn(e);
    }
  }

  return {
    files: files,
    indexes: indexes,
    others: others
  };
};


/*
# Plugins: Entries
# Allow for the first encountered plugin::entries subroutine to override the
# default built-in entries subroutine
*/
for (var i = 0; i < plugins_array.length; i++) {
  if (plugins_hash[plugins_array[i]] > 0 && modules[plugins_array[i]].entries) {
    entries = modules[plugins_array[i]].entries;
    break;
  }
}

var result = entries();
files = result.files;
indexes = result.indexes;
others = result.others;

/* # Plugins: Filter */
for (var i = 0; i < plugins_array.length; i++) {
  if (plugins_hash[plugins_array[i]] > 0 && modules[plugins_array[i]].filter) {
    var result = modules[plugins_array[i]].filter(files, others);
    break;
  }
}

var header;

/* # Static */
if (!process.env.GATEWAY_INTERFACE && process.argv[2] && static_password && process.argv[2].split('=')[1] == static_password) {

  if(!QUERY['-quiet']) {
    console.log('Blosxom is generating static index pages...');
  }

  /* # Home Page and Directory Indexes */
  // TODO: static


/* # Dynamic */
} else {

  var content_type = template(path_info, 'content_type', $flavour);
  content_type = content_type.replace(/\n[\S\S]*/, '');
  console.log(generate('dynamic', path_info, [$path_info_yr, path_info_mo_num, $path_info_da].join('/'), $flavour, content_type));
}


/* # Plugins: End */
for (var i = 0; i < plugins_array.length; i++) {
  if (plugins_hash[plugins_array[i]] > 0 && modules[plugins_array[i]].end) {
    entries = modules[plugins_array[i]].end();
    break;
  }
}


/* # Generate */
function generate(static_or_dynamic, currentdir, date, flavour, $content_type) {

  var f = files;

  /*
  # Plugins: Skip
  # Allow plugins to decide if we can cut short story generation
  */
  var skip;

  for (var i = 0; i < plugins_array.length; i++) {
    if (plugins_hash[plugins_array[i]] > 0 && modules[plugins_array[i]].skip) {
      skip = modules[plugins_array[i]].skip;
      break;
    }
  }

  var interpolate = function(tpl) {
    tpl = tpl.replace(/(\$\w+(?:::)?\w*)/g, function(str, p1) {
      p1 = p1.replace(/::/g, '.');
      try {
        var temp = eval(p1);
        return temp ? temp : '';
      } catch (e) {
        for (var i = 0; i < plugins_array.length; i++) {
          p1 = p1.replace(/\$/g, '');
          if (plugins_hash[plugins_array[i]] > 0) {
            try {
              var temp = eval('modules.' + plugins_array[i] + '.' + p1);
              return temp ? temp : '';
            } catch (e) {
            }
          }
        }
      }
    });
    return tpl;
  };

  if (typeof skip == 'undefined' || !skip) {

    /*
    # Plugins: Interpolate
    # Allow for the first encountered plugin::interpolate subroutine to
    # override the default built-in interpolate subroutine
    */
    for (var i = 0; i < plugins_array.length; i++) {
      if (plugins_hash[plugins_array[i]] > 0 && modules[plugins_array[i]].interpolate) {
        interpolate = modules[plugins_array[i]].interpolate;
        break;
      }
    }

    /* # Head */
    var head = template(currentdir, 'head', flavour);

    /* # Plugins: Head */
    // TODO: plugin
    for (var i = 0; i < plugins_array.length; i++) {
      if (plugins_hash[plugins_array[i]] > 0 && modules[plugins_array[i]].head) {
        entries = modules[plugins_array[i]].head(currentdir, head);
        break;
      }
    }

    head = interpolate(head);

    var output = head;

    /* # Stories */
    var curdate = '';
    var ne = num_entries;

    var matches = currentdir.match(/(.*?)([^\/]+)\.(.+)$/);
    if (matches && matches[2] != 'index') {
      currentdir = matches[1] + matches[2] + '.' + file_extension;
      if(files[datadir + '/' + matches[1] + matches[2] + '.' + file_extension]) {
        f = {};
        f[datadir + '/' + matches[1] + matches[2] + '.' + file_extension] = files[datadir + '/' + matches[1] + matches[2] + '.' + file_extension];
      }
    } else {
      currentdir = currentdir.replace(/index\..+$/, '');
    }

    /* # Define a default sort subroutine */
    var sort = function(files) {
      var a = [];
      for(var i in files) {
        a.push(i);
      }
      a.sort(function(a, b) {
        return files[a] > files[b];
      });
      return a;
    };

    /*
    # Plugins: Sort
    # Allow for the first encountered plugin::sort subroutine to override the
    # default built-in sort subroutine
    */
    for (var i = 0; i < plugins_array.length; i++) {
      if (plugins_hash[plugins_array[i]] > 0 && modules[plugins_array[i]].sort) {
        sort = modules[plugins_array[i]].sort;
        break;
      }
    }

    /* # Date specified by path_info(url) */
    var path_info_yr = date.split('/')[0];
    var path_info_mo_num = date.split('/')[1];
    var path_info_da = date.split('/')[2];

    // TODO: others is unused?
    // Original code: foreach my $path_file ( &$sort(¥%f, ¥%others) ) {
    var path_files = sort(f);
    for (var i = 0; i < path_files.length; i++) {
      if (ne <= 0 && !/\d/.test(date)) {
        break;
      }

      path_files[i].match(new RegExp(['^', datadir, '\\/(?:(.*)\\/)?(.*)\\.', file_extension].join('')));
      var $path = RegExp.$1;
      var $fn = RegExp.$2;

      /* # Only stories in the right hierarchy */
      if (!new RegExp('^' + currentdir).test($path) && path_files[i] != datadir + '/' + currentdir) {
        continue;
      }

      /* # Prepend a slash for use in templates only if a path exists */
      $path = '/' + $path;

      /* # Date fiddling for by-{year,month,day} archive views */
      var nice = nice_date(files[path_files[i]]);
      var $dw = nice[0],
        $mo = nice[1],
        $mo_num = nice[2],
        $da = nice[3],
        $ti = nice[4],
        $yr = nice[5];
      var hr = $ti.split(':')[0];
      var min = $ti.split(':')[1];
      var hr12, ampm;
      if (hr >= 12) {
        hr12 = hr - 12;
        ampm = 'pm';
      } else {
        hr12 = hr;
        ampm = 'am';
      }
      hr12 = ('' + hr12).replace(/^0/, '');
      if (hr12 == 0) {
        hr12 = 12;
      }

      /* # Only stories from the right date */
      if (path_info_yr && $yr != path_info_yr) {
        continue;
      }
      if (path_info_yr && $yr < path_info_yr) {
        break;
      }
      if (path_info_mo_num && $mo != num2month[path_info_mo_num]) {
        continue;
      }
      if (path_info_da && $da != path_info_da) {
        continue;
      }
      if (path_info_da && $da < path_info_da) {
        break;
      }

      /* # Date */
      date = template($path, 'date', flavour);

      /* # Plugins: Date */
      for (var j = 0; j < plugins_array.length; j++) {
        if (plugins_hash[plugins_array[j]] > 0 && modules[plugins_array[j]].date) {
          entries = modules[plugins_array[j]].date(currentdir, date, files[path_file], $dw, $mo, $mo_num, $da, $ti, $yr);
          break;
        }
      }

      date = interpolate(date);

      if (curdate != date) {
        curdate = date;
        output += date;
      }

      var $title, $body, raw;
      var stat = fs.statSync(path_files[i]);
      if (stat.isFile()) {
        var file = fs.readFileSync(path_files[i], 'UTF-8');
        file = file.replace(/\n$/, '');
        var lines = file.split('\n');
        $title = lines.shift();
        $body = lines.join('\n');
        raw = $title + '\n' + $body;
      }
      var story = template($path, 'story', flavour);

      /* # Plugins: Story */
      for (var j = 0; j < plugins_array.length; j++) {
        if (plugins_hash[plugins_array[j]] > 0 && modules[plugins_array[j]].story) {
          entries = modules[plugins_array[j]].story(path, fn, story, title, body);
          break;
        }
      }

      if (/\Wxml/.test($content_type)) {
        /* # Escape <, >, and &, and to produce valid RSS */
        $title = escapeHTML($title);
        $body = escapeHTML($body);
      }

      story = interpolate(story);

      output += story;

      ne--;
    }

    /* # Foot */
    var foot = template(currentdir, 'foot', flavour);

    /* # Plugins: Foot */
    for (var i = 0; i < plugins_array.length; i++) {
      if (plugins_hash[plugins_array[i]] > 0 && modules[plugins_array[i]].foot) {
        entries = modules[plugins_array[i]].foot(currentdir, foot);
        break;
      }
    }

    foot = interpolate(foot);
    output += foot;

    /* # Plugins: Last */
    for (var i = 0; i < plugins_array.length; i++) {
      if (plugins_hash[plugins_array[i]] > 0 && modules[plugins_array[i]].last) {
        entries = modules[plugins_array[i]].last(currentdir, foot);
        break;
      }
    }

  } /* # End skip */

  /* # Finally, add the header, if any and running dynamically */
  if (static_or_dynamic == 'dynamic') {
    output = 'Content-Type: ' + content_type + '\n\n' + output;
  }

  return output;
}

/*
console.log('<pre>');
console.log(process.env);
console.log('</pre>');
*/

/*
console.log('happy noding:-)');
console.log($url);
console.log('</pre>');
console.log(num2month);
console.log('<pre>');
console.log(paths);
console.log(path_info);
console.log(path_info_yr, path_info_mo, path_info_da, path_info_mo_num);

*/

} catch (e) {
  console.log('Content-Type: text/html; charset=UTF-8');
  console.log('');
  console.log('<pre>');
  console.log(e.message);
  console.log(e.stack);
  console.log('</pre>');
}


function nice_date(unixtime) {

  var c_time;
  try {
    c_time = new Date(fs.statSync(unixtime).ctime).toString();
  } catch (e) {
    try {
    c_time = new Date(unixtime).toString();
    } catch (e) {
      console.log('err', e);
    }
  }
  var matches = c_time.match(/(\w{3}) +(\w{3}) +(\d{1,2}) +(\d{4}) +(\d{2}:\d{2}):\d{2}/);

  var dw = matches[1],
    mo = matches[2],
    da = matches[3],
    ti = matches[5],
    yr = matches[4];

  da = ('0' + da).slice(-2);
  var mo_num = month2num[mo];

  return [dw, mo, mo_num, da, ti, yr];
}


}

function __DATA__() {
return [
'html content_type text/html',
'html head <html><head><link rel="alternate" type="type="application/rss+xml" title="RSS" href="$url/index.rss" /><title>$blog_title $path_info_da $path_info_mo $path_info_yr</title></head><body><center><font size="+3">$blog_title</font><br />$path_info_da $path_info_mo $path_info_yr</center><p />',
'html story <p><a name="$fn"><b>$title</b></a><br />$body<br /><br />posted at: $ti | path: <a href="$url$path">$path</a> | <a href="$url/$yr/$mo_num/$da#$fn">permanent link to this entry</a></p>\n',
'html date <h3>$dw, $da $mo $yr</h3>\n',
'html foot <p /><center><a href="http://www.blosxom.com/"><img src="http://www.blosxom.com/images/pb_blosxom.gif" border="0" /></a></body></html>',
'rss content_type text/xml',
'rss head <?xml version="1.0"?>\n<!-- name="generator" content="blosxom/$version" -->\n<!DOCTYPE rss PUBLIC "-//Netscape Communications//DTD RSS 0.91//EN" "http://my.netscape.com/publish/formats/rss-0.91.dtd">\n\n<rss version="0.91">\n  <channel>\n    <title>$blog_title $path_info_da $path_info_mo $path_info_yr</title>\n    <link>$url</link>\n    <description>$blog_description</description>\n    <language>$blog_language</language>\n',
'rss story   <item>\n    <title>$title</title>\n    <link>$url/$yr/$mo_num/$da#$fn</link>\n    <description>$body</description>\n  </item>\n',
'rss date \n',
'rss foot   </channel>\n</rss>',
'error content_type text/html',
'error head <html><body><p><font color="red">Error: I\'m afraid this is the first I\'ve heard of a "$flavour" flavoured Blosxom.  Try dropping the "/+$flavour" bit from the end of the URL.</font>\n\n',
'error story <p><b>$title</b><br />$body <a href="$url/$yr/$mo_num/$da#fn.$default_flavour">#</a></p>\n',
'error date <h3>$dw, $da $mo $yr</h3>\n',
'error foot </body></html>',
'__END__'
];
}

function escapeHTML(s) {
  s = s.replace(/&/g, '&amp;');
  s = s.replace(/</g, '&lt;');
  s = s.replace(/>/g, '&gt;');
  s = s.replace(/"/g, '&quot;');
  return s;
}

var headed = false;
var debug = true;
function log() {
  if(typeof debug != 'undefined') {

  if (!headed) {
      console.log('Content-Type: text/html; charset=UTF-8');
      console.log('');
      headed = true;
  }
  console.log('*******************************************************', '<br />');
  console.log.apply(null, arguments);
  console.log('<br />');

  }
}
