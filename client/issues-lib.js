(function() {

if (window.Issue && window.IssueList) {
  return;
}

// Colours are copied from:
// https://www.google.com/design/spec/style/color.html#color-color-palette
var _reviewLevelMetadata = {
  'daily': {
    query: {label: 'Update-daily'},
    outOfSLOColor: '#B71C1C',  // Red 900
  },
  'weekly': {
    query: {label: 'Update-weekly'},
    outOfSLOColor: '#C62828',  // Red 800
  },
  'fortnightly': {
    query: {label: 'Update-fortnightly'},
    outOfSLOColor: '#D32F2F',  // Red 700
  },
  'monthly': {
    query: {label: 'Update-monthly'},
    outOfSLOColor: '#E53935',  // Red 600
  },
  'quarterly': {
    query: {label: 'Update-quarterly'},
    outOfSLOColor: '#F44336',  // Red 500
  },
  'none (P0)': {
    query: {label: 'Pri-0', '-has': 'update'},
  },
  'none (P1)': {
    query: {label: 'Pri-1', '-has': 'update'},
  },
  'none (P2)': {
    query: {label: 'Pri-2', '-has': 'update'},
  },
  'none (P3)': {
    query: {label: 'Pri-3', '-has': 'update'},
  },
};
var _defaultReviewLevel = 'none';
var _inSLOColor = '#4CAF50';  // Green 500
var _noSLOColor = '#757575';  // Grey 600

var Issue = function(monorailIssue) {
  this._rawData = monorailIssue;

  this.id = monorailIssue.id;
  if (monorailIssue.owner) {
    this.owner = monorailIssue.owner.name;
  } else {
    this.owner = null;
  }
  this.summary = monorailIssue.summary;
  this.priority = undefined;
  this._reviewLevel = _defaultReviewLevel;

  this._lastUpdatedString = monorailIssue.updated;
  this._lastUpdatedMS = Date.parse(this._lastUpdatedString);

  for (var i = 0; i < monorailIssue.labels.length; i++) {
    var label = monorailIssue.labels[i];
    if (label.substring(0, 4) == 'Pri-') {
      this.priority = Number(label.substring(4));
    }
    if (label.substring(0, 7) == 'Update-') {
      var reviewLevel = label.substring(7).toLowerCase();
      if (reviewLevel in _reviewLevelMetadata) {
        this._reviewLevel = reviewLevel;
      }
    }
  }
};

Issue.prototype = {
  daysSinceUpdate: function() {
    return Math.floor((Date.now() - this._lastUpdatedMS) / (1000 * 60 * 60 * 24));
  },

  lastUpdated: function() {
    var result = new Date(this._lastUpdatedMS);
    return result.toDateString();
  },

  reviewLevelWithBackoff: function() {
    var result = this._reviewLevel;
    if (result == _defaultReviewLevel) {
      result += ' (P' + this.priority + ')';
    }
    return result;
  },
};

var IssueList = function() {
  this._data = [];
};

IssueList.prototype = {
  append: function(issue) {
    this._data.push(issue);
  },

  length: function() {
    return this._data.length;
  },

  _reviewLevelCounts: function() {
    var result = {};
    for (var i = 0; i < this._data.length; i++) {
      var reviewLevel = this._data[i].reviewLevelWithBackoff();
      if (reviewLevel in result) {
        result[reviewLevel]++;
      } else {
        result[reviewLevel] = 1;
      }
    }
    return result;
  },

  _outOfUpdateSLOCounts: function(updateSLO) {
    var result = {};
    for (var reviewLevel in updateSLO) {
      result[reviewLevel] = 0;
    }
    for (var i = 0; i < this._data.length; i++) {
      var issue = this._data[i];
      var reviewLevel = issue.reviewLevelWithBackoff();
      if (reviewLevel in updateSLO && issue.daysSinceUpdate() >= updateSLO[reviewLevel]) {
        result[reviewLevel]++;
      }
    }
    return result;
  },

  summary: function(updateSLO) {
    var totals = this._reviewLevelCounts();
    var outOfSLO = this._outOfUpdateSLOCounts(updateSLO);
    var results = [];
    for (var level in _reviewLevelMetadata) {
      var metadata = _reviewLevelMetadata[level];
      if (level in totals) {
        var color = (level in updateSLO) ? _inSLOColor : _noSLOColor;
        var levelSummary = totals[level].toString();
        if (level in outOfSLO && outOfSLO[level] > 0) {
          color = metadata.outOfSLOColor;
          levelSummary += ' (' + outOfSLO[level] + ' out of SLO)';
        }
        results.push({
          level: level,
          color: color,
          query: metadata.query,
          summary: levelSummary,
        });
      }
    }
    return results;
  },
};

window.Issue = Issue;
window.IssueList = IssueList;

})();
