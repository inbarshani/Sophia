var d3Topics = {
  svg: null,

  initTopics: function()
  {
    var outerRadius = 600 / 2;

    this.svg = d3.select("#topics-vis-container").append("svg")
        .attr("width", outerRadius * 2)
        .attr("height", outerRadius * 2)
      .append("g")
        .attr("transform", "translate(" + outerRadius + "," + outerRadius + ")");

    //d3.select(self.frameElement).style("height", outerRadius * 2 + "px");
  },

  loadTopics: function(topics, relations){
    if (!this.svg)
      this.initTopics();
    else
    {
        this.svg.html("");

    }

    var outerRadius = 600 / 2;
    var innerRadius = outerRadius - 100;

    var fill = d3.scale.category20c();

    var chord = d3.layout.chord()
        .padding(.04);

    var matrix = this.createMatrix(topics, relations);
    //console.log('matrix:\n'+matrix);
    chord.matrix(matrix);

    var arc = d3.svg.arc()
        .innerRadius(innerRadius)
        .outerRadius(innerRadius + 20);

    var g = this.svg.selectAll(".group")
        .data(chord.groups)
      .enter().append("g")
        .attr("class", "group")
        .on("mouseover", this.fadeTopic(.1))
        .on("mouseout", this.fadeTopic(1));

    g.append("path")
        .style("fill", function(d) { return fill(d.index); })
        .style("stroke", function(d) { return fill(d.index); })
        .attr("d", arc);

    g.append("text")
        .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
        .attr("dy", ".35em")
        .attr("transform", function(d) {
          return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
              + "translate(" + (innerRadius + 26) + ")"
              + (d.angle > Math.PI ? "rotate(180)" : "");
        })
        .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
        .text(function(d) { 
          if (topics[d.index])
            return topics[d.index].name; 
          else return ''+d.index;
        });

    g = this.svg.selectAll(".chord")
        .data(chord.chords)
      .enter().append("g")
        .attr("class", "group")
        .on("mouseover", this.fadeTopic(.1))
        .on("mouseout", this.fadeTopic(1));

    g.append("path")
        .attr("class", "chord")
        .style("stroke", function(d) { return d3.rgb(fill(d.source.index+5)).darker(); })
        .style("fill", function(d) { return fill(d.source.index+5); })
        .attr("d", d3.svg.chord().radius(innerRadius));

    g.append("text")
        .each(function(d) { 
          d.angle = (d.source.startAngle + d.source.endAngle) / 2; })
        .attr("dy", ".35em")
        .attr("class", "chord")
        .attr("transform", function(d) {
          return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
              + "translate(" + (innerRadius - 26) + ")"
              + (d.angle > Math.PI ? "rotate(180)" : "");
        })
        .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
        .text(function(d) { 
          return '' + matrix[d.source.index][d.target.index]; 
        });

    g.append("text")
        .each(function(d) { 
          d.angle = (d.target.startAngle + d.target.endAngle) / 2; })
        .attr("dy", ".35em")
        .attr("class", "chord")
        .attr("transform", function(d) {
          return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
              + "translate(" + (innerRadius - 26) + ")"
              + (d.angle > Math.PI ? "rotate(180)" : "");
        })
        .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
        .text(function(d) { 
          return '' + matrix[d.source.index][d.target.index]; 
        });

  },

  createMatrix: function(topics, relations) {
    var matrix = [];
    // init with empty arrays to create a 2-dimensional empty array
    for(var i=0;i<topics.length;i++)
    {
      matrix[i] = [];
      for(var j=0;j<topics.length;j++)
        matrix[i][j] = 0;
    } 

    var hasRealRelations = false;

    relations.forEach(function(relation){
      if (relation.sourceIndex != relation.targetIndex)
      {
        matrix[relation.sourceIndex][relation.targetIndex] = relation.numOfLinks;
        matrix[relation.targetIndex][relation.sourceIndex] = relation.numOfLinks;
        hasRealRelations = hasRealRelations || (relation.numOfLinks > 0);
      }
    });
    
    if (!hasRealRelations)
    {
      for(var i=0;i<topics.length;i++)
        matrix[i][i] = 1;
    }

    return matrix;
  },

  fadeTopic: function(opacity) {
    var svg = this.svg;
    return function(g, i) {
      svg.selectAll(".chord")
          .filter(function(d) { 
            return d.source.index != i && d.target.index != i; 
          })
        .transition()
          .style("opacity", opacity);
    };
  }  
};

