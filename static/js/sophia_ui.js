      var lastNode;
      var prevSteps = [];
      var prevResearches = [];
      var lastStep = {};
      var lastResearch = {};
      var savedSteps = [];
      var lastStepStatus = {};
      var lastStepExpectedCondition;
      var actionIds = [];
      var researchActionIds = [];
      var isAjaxActive = false;
      var savedTests = [];
      var cmNode;

      var d3Settings;

      var categories = [{name: "Server", value: "", keywords: ["server"]}, {name: "Network", value: "", keywords: ["network", "net", "request"]}, {name: "Testing", value: "", keywords: ["test", "step"]}, {name: "UI", value: "", keywords: ["action", "ui"]}];


      $(document).ready(function() {
        // initialize tabs
        $( "#tabs" ).tabs();
        // initialize accorion
        $( "#accordionTests" ).accordion({
          heightStyle: "content",
          activate: function( event, ui ) {
            $( "#accordionActions" ).accordion( "refresh" );
            if (ui.newPanel[0].id == "accordionExecution") {
              // do nothing
            } else if (ui.newPanel[0].id == "accordionSavedTests") {
              loadTests();
            }
          }
        });

        $( "#accordionResearch" ).accordion({
          heightStyle: "content",
          activate: function( event, ui ) {
            $( "#accordionResearch" ).accordion( "refresh" );
            if (ui.newPanel[0].id == "accordionResearchForm") {
              // do nothing
            } else if (ui.newPanel[0].id == "accordionSavedResearch") {
              loadSavedResearch();
            }
          }
        });

        // fill types list
        getNodesLabels();

        d3Settings = {
          width: 1150,
          height: $('#graphWrapper').css('height').replace('px', ''),
          r: 30,
          linkLength: 150,
          charge: -3000,
          gravity: 0.05,
          friction: 0.3
        };

        // initialize d3
        var svg = d3.select("#graph_container").append("svg")
          .attr("width", d3Settings.width)
          .attr("height", d3Settings.height);

        var color = d3.scale.category20();

        var force = d3.layout.force()
            .charge(d3Settings.charge)
            .linkDistance(d3Settings.linkLength)
            .size([d3Settings.width, d3Settings.height])
            .friction(d3Settings.friction)
            .gravity(d3Settings.gravity);

        var nodes = force.nodes(),
            links = force.links(),
            node = svg.selectAll(".node"),
            link = svg.selectAll(".link"),
            label = svg.selectAll(".text");

         d3.select("body").on('click',function () {
            hideWin('contextMenu');
         });

        $('#testing_query_button').click(function() {
          if ($('#q').val().length == 0) {
            error('Step Description cannot be empty');
            return false;
          }
          var expectedArr = $('#expected').val().split(" ");
          if ($('#expected').val().length > 0 && expectedArr.length != 4) {
            error('Expected results must contain 4 parts:<br>{entity name} {property} {sign} {value}.<br> For example: ServerCPU AVG > 4');
            return false;
          }
          lastStepExpectedCondition = $('#expected').val();
          runQuery( $('#q').val(), $('#expected').val());
          return false;
        });

        $('#testNameButton').click(function() {
          if ($('#testNameText').val().length == 0) {
            error('Test name cannot be empty');
            return false;
          }
          saveTest( $('#testNameText').val() );
          hideWin('testName');
          return false;
        });

        $('#testSaveIcon').click(function() {
          if (!$('#testSaveIcon').hasClass('disabled')) {
            showWin('testName', $(this).offset());
          }
        });

        $('#cmRemove').click(function() {
          var nodeIndex = getNodeIndex(nodes, cmNode.id);
          var linkIndex;
          nodes.splice(nodeIndex, 1);
          for (var i = 0; i < links.length; i++) {
            if (links[i].source.index == nodeIndex || links[i].target.index == nodeIndex) {
              linkIndex = getNodeIndex(links, links[i].id);
              links.splice(linkIndex, 1);
              i--;
            }
          }
          var actionIdIndex = -1;
          for (i = 0; i < actionIds.length; i++) {
            if (actionIds[i] == cmNode.id) {
              actionIdIndex = i;
              break;
            }
          }
          if (actionIdIndex > -1) {
            actionIds.splice(actionIdIndex, 1);
          }
//          label[0].splice(nodeIndex, 1);
          restart();
        });

        $('#research_query_button').click(function() {
          lastStepExpectedCondition = $('#expected').val();
          if ($('#research').val().length == 0) {
            error('Search cannot be empty');
            return false;
          }
          lastResearchDesc = $('#research').val();
          runResearchQuery( $('#research').val(), $('#nodeType').val());
          return false;
        });

        function runQuery(query, expected) {
          queryActions(query, expected);
        }

        function runResearchQuery(query, types) {
          queryResearch(query, types);
        }

        function nodeOnClick(nodeObj, node, link) {
          // set node stroke
          if (typeof lastNode != 'undefined') {
            d3.select(lastNode)
              .style("stroke","white");
          }
          lastNode = nodeObj;
          d3.select(nodeObj)
            .style("stroke","red");

          // show details frame
          var props = nodeObj.__data__.properties;
          if (props != undefined) {
            var list = '';
            for(var key in props) {
              if(props.hasOwnProperty(key)) {
                list += '<tr><td class="key_text">' + key + ' </td><td class="value_text">' + props[key] + '</td></tr>';
              }
            }
            $('#details > table').html(list);
            $('#details > div.header > span').text(nodeObj.__data__.name);
            $('#details').css('visibility', 'visible');
          }
        }

        function queryActions(query, expected) {
          // query by description and expected results
          d3.json("/query?q=" + query + "&expected=" + expected + "&actionIds=" + actionIds, function(error, graph) {
            addNodes(graph, true, "testing");
          });
          showBusy();
        }

        function queryResearch(query, types) {
          // query by description and expected results
          d3.json("/research?research=" + query + "&nodeType=" + types + "&actionIds=" + researchActionIds, function(error, graph) {
            addNodes(graph, true, "research");
          });
          showBusy();
        }

        function getLinkedNodes(nodeId) {
          lastStepExpectedCondition = "";
          // query by Node ID for linked entities
          d3.json("/expand?id=" + nodeId, function(error, graph) {
            addNodes(graph, false, "testing");
          });
          showBusy();
        }

        function addNodes(graph, isNewStep, type) {
          hideBusy();
          if (isNewStep) {
            actionIds = [];
          }

          if (graph.nodes.length == 0) {
            if (isNewStep) {
              // 0 results - fail step and show error
              lastStepStatus.status = "Failed";
              lastStepStatus.reason = "No results";
            }
            error('Query returned 0 results');
            return;
          }

          if (isNewStep) {
            if (lastStepExpectedCondition.length > 0)          
              lastStepStatus = {"status": "Failed", "reason": "Expected results were not found", "ids": []};
            else
              lastStepStatus = {"status": "Passed", "reason": "", ids: []};
          }

          for (var i=0;i<graph.nodes.length;i++) {
            var n = graph.nodes[i];
            if (findNodeById(nodes, n.id) == null) {
              nodes.push(n);
              if (n.label == 'TestStep' || n.label == 'UserAction') {
                actionIds.push(n.id);
                lastStepStatus.ids.push(n.id);
              }
              if (isNewStep && (lastStepStatus.status == "Failed") && n.isCondition) {
                lastStepStatus.status = "Passed";
                lastStepStatus.reason = "";
              }
            }
          }

          if (isNewStep && lastStepStatus.status == "Failed") {
            error(lastStepStatus.reason);
          }

          var l;          
          for (i=0;i<graph.links.length;i++) {
            l = graph.links[i];
            l.source = getNodeIndex(nodes, l.source);
            l.target = getNodeIndex(nodes, l.target);
            if (findLinkByIds(graph.links, l.source, l.target) == null) {
              links.push(l);
            }
          }
          if (isNewStep) {
            addPrevRow(type);
          }
          restart();
        }

        function restart() {
          link = link.data(links, function(d) {return d.id});
          link.enter().insert("line", ".node")
              .attr("class", "link")
                          .style("stroke-dasharray", function(d) {
              if (d.value == 'FAR') {
                return 5,5;
              } else {
                return 0,0;
              }
            })
            .style("stroke-width", function(d) {
              if (d.value == 'FAR') {
                return 5;
              } else {
                return 5;
              }
            });
          link.exit().remove();

          node = node.data(nodes, function(d) {return d.id});
          node.enter().insert("circle", ".cursor")
              .attr("class", "node")
              .attr("r", d3Settings.r)
              .style("fill", function(d) { 
                return color(d.label); 
              })
              .call(force.drag);
          node.exit().remove();

          node.append("title")
            .text(function(d) { return d.name; });

          label = label.data(nodes, function(d) {return d.id});
          label
            .enter()
            .insert("text", ".node")
            .attr("class", "node-text")
            .attr({ "x":function(d){ return d.x; },
                    "y":function(d){ return d.y;}})
            .text(function(d){return getNodeLabel(d);})
            .call(force.drag);
          label.exit().remove();

          force.on("tick", function() {
            link.attr("x1", function(d) { return d.source.x; })
              .attr("y1", function(d) { return d.source.y; })
              .attr("x2", function(d) { return d.target.x; })
              .attr("y2", function(d) { return d.target.y; });

            node.attr("cx", function(d) { return d.x; })
              .attr("cy", function(d) { return d.y; });

            label.attr("x", function(d) { return d.x + 40; })
            .attr("y", function(d) { return d.y -15; }); 
          });

          svg.selectAll("circle.node").on("click", function(){
            nodeOnClick(this, node, link);
          });

          svg.selectAll("circle.node").on("dblclick", function(){
            getLinkedNodes(this.__data__.id);
          });

          svg.selectAll("circle.node").on("contextmenu", function(){
            var d3_target = d3.select(d3.event.target);
            cmNode = d3_target.datum();
            showWin('contextMenu', $(this).offset());
            d3.event.preventDefault();
          });

          force
            .charge(function(d) {
              if (d.label == 'TestStep' || d.label == 'UserAction') {
                return d3Settings.charge;
              } else {
                return d3Settings.charge;
              }
            })
            .linkDistance(d3Settings.linkLength)
            .start();
          }

        function findNodeById(nodes, id) {
          for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].id == id) {
              return nodes[i];
            }
          }
          return null;
        }

        function findLinkByIds(links, from, to) {
          for (var i = 0; i < links.length; i++) {
            if (links[i].source.index == from && links[i].target.index == to) {
              return links[i];
            }
          }
          return null;
        }

        function getNodeIndex(nodes, id) {
          for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].id == id) {
              return i;
            }
          }
          return null;
        }

        function getNodeLinksindexes(nodeIndex) {
          var linksArr = [];
          for (var i = 0; i < links.length; i++) {
            if (links[i].source.index == nodeIndex || links[i].target.index == nodeIndex) {
              linksArr.push(i);
            }
          }
          return linksArr;
        }

        function getNodeLabel(d) {
          if (d.label == 'Test') {
            return 'Test ' + d.properties.TestNumber;
          } else if (d.label == 'TestStep') {
            var title;
            if (d.name.length > 15) {
              title = d.name.substring(0,15) + '...';
            } else {
              title = d.name;
            }
            title = title +': ' + d.properties.Status;
            return title;
          } else if (d.label == 'ServerRequest') {
            if (d.properties.HTTP_result == '200') {
              return '200 OK';
            } else {
              return 'Error ' + d.properties.HTTP_result;
            }
          } else if (d.label == 'ServerCPU') {
            return 'CPU: ' + d.properties.AVG;
          } else if (d.label == 'ServerMemory') {
            return 'Used: ' + d.properties.VIRTUAL_USED_PRECENT;
          }
          return d.label;
        }

        function saveTest(testName) {
          var test = {"name": testName,
                      "steps": prevSteps
                    };
          savedTests.push(test);
        }

        function loadTests() {
          // query server for saved test executions
          $.ajax({  
            type: 'GET',  
            url: '/tests',  
            cache: false,
            success: function(data){
              showTests(savedTests);
            },
            error: function (textStatus, errorThrown){error(errorThrown);}
          });  
        }

        function showTests(tests) {
          $('#savedTestsTable').html('');
          if (tests.length > 0) {
            tests.forEach(function (test) {
              addSavedTest(test);
            });
          }
        }

        function loadSavedResearch() {

        }

        function runExamineQuery(query, ids) {
          // query by description and expected results
          d3.json("/stepresearch?search=" + query + "&actionIds=" + ids, function(error, graph) {
            addNodes(graph, false);
          });
          showBusy();
        }

        function getNodesLabels() {
          // get all node types
          d3.json("/nodetypes", function(error, types) {
            $.each(types, function(key, value){
              addValueToCategories(value.label[0]);
            });
            categories.forEach (function (category) {
              $('#nodeType').append($("<option>", {
                value: category.value,
                text: category.name
              }));

            });
          });
        }

        function addValueToCategories (nodeTypeValue) {
          // find node type in relevant keywords
          var ntv = nodeTypeValue.toLowerCase();
          categories.forEach (function (category) {
            category.keywords.forEach(function (keyword) {
              if (ntv.indexOf(keyword) > -1 && category.value.indexOf(nodeTypeValue + ';') == -1) {
                category.value += nodeTypeValue + ';';
              }
            });
          });
        }


        function renderError(errors) {
         clearErrors();
          renderErrorWithoutClear(errors);
          $('#errorsAndWarnings').fadeIn();
        }

        function renderErrorWithoutClear(errors) {
          $.each(errors, function(index, error) {
            $('#errorsAndWarnings').append('<p class="' + error.type + '"><span></span>' + error.message + '</p>');
          });
        }

        function clearErrors() {
          $('#errorsAndWarnings').html('');
          $('#errorsAndWarnings').hide();
        }

        function error(text) {
          renderError([{type: 'error', message: text}]);
          setTimeout(function() {
            clearErrors();
          }, 7000);
        }

        function addPrevRow(type) {
          var numRows;
          if (type == 'testing') {
            numRows = $('#prevQueries tr').length;
            if (numRows == 0) {
              $('#testSaveIcon').removeClass('disabled');
              numRows = 1;
            }
            appendStepRow($('#prevQueries'), numRows, $('#q').val(), $('#expected').val(), lastStepStatus, 0);
            lastStep = {"id": numRows, "description": $('#q').val(), "expected": $('#expected').val(), "status": lastStepStatus};
            prevSteps.push(lastStep);

            $('#q').val('');
            $('#expected').val('');
          } else if (type == 'research') {
            numRows = $('#prevResearchQueries tr').length;
            if (numRows == 0) {
              $('#researchSaveIcon').removeClass('disabled');
              numRows = 1;
            }
            lastResearch = {"id": numRows, "what": $('#nodeType').find('option:selected').text(), "searchTerm": $('#research').val()};
            prevResearches.push(lastResearch);
            appendResearchRow($('#prevResearchQueries'), numRows, lastResearch);
            $('#research').val('');
          }
        }

        function appendStepRow(table, id, description, expected, status, cellsBefore) {
          var tr, td, a;
          if (id == 1) {
            // add header
            tr = $('<tr>');
            tr.addClass('table-row');
            for (var i = 0; i < cellsBefore; i++) {
              td = $('<td>');
              td.addClass('table-cell')
              td.text('');
              td.appendTo(tr);
            }
            td = $('<td>');
            td.addClass('table-cell border bold')
            td.text('Step');
            td.appendTo(tr);
            td = $('<td>');
            td.addClass('table-cell border bold')
            td.text('Description');
            td.appendTo(tr);
            td = $('<td>');
            td.addClass('table-cell border bold')
            td.text('Expected Results');
            td.appendTo(tr);
            td = $('<td>');
            td.addClass('table-cell border bold')
            td.text('Status');
            td.appendTo(tr);
            tr.appendTo(table);
          }
          tr = $('<tr>');
          tr.addClass('table-row');
          for (var i = 0; i < cellsBefore; i++) {
            td = $('<td>');
            td.addClass('table-cell')
            td.text('');
            td.appendTo(tr);
          }
          td = $('<td>');
          td.addClass('table-cell border');
          td.text(id);
          td.appendTo(tr);
          td = $('<td>');
          td.addClass('table-cell border');
          td.text(description);
          td.appendTo(tr);
          td = $('<td>');
          td.addClass('table-cell border');
          td.text(expected);
          td.appendTo(tr);
          td = $('<td>');
          td.addClass('table-cell border');
          a = $('<a>');
          a.href='#';
          a.click(function() {
            showExamine(status, $(this).offset());
          });
          a.text(status.status);
          a.appendTo(td);
          td.appendTo(tr);
          tr.appendTo(table);
        }

        function addSavedTest(test) {
          var tr, td, a, img;
          // add test name
          tr = $('<tr>');
          tr.addClass('table-row');
          td = $('<td>');
          td.addClass('table-cell');
          td.attr('title', 'Run');
          img = $("<img>");
          img.attr("src", "./img/icon_run.png");
          img.css('margin', '5px');
          img.click(function() {
            // re-run test
          })
          img.appendTo(td);
          td.appendTo(tr);
          td = $('<td>');
          td.addClass('table-cell bold');
          td.text("Test Name:");
          td.appendTo(tr);
          td = $('<td>');
          td.addClass('table-cell bold');
          td.text(test.name);
          td.appendTo(tr);
          td = $('<td>');
          td.addClass('table-cell');
          td.text('');
          td.appendTo(tr);
          td.appendTo(tr);
          tr.appendTo($('#savedTestsTable'));

          // add steps          
          var id = 1;
          test.steps.forEach(function(step) {
            appendStepRow($('#savedTestsTable'), id, step.description, step.expected, step.status, 1);
            id++;
          });
        }

        function appendResearchRow(table, id, research) {
          var tr, td, img;
          if (id == 1) {
            // add header
            tr = $('<tr>');
            tr.addClass('table-row');
            td = $('<td>');
            td.addClass('table-cell border bold')
            td.text('Query');
            td.appendTo(tr);
            td = $('<td>');
            td.addClass('table-cell border bold')
            td.text('What');
            td.appendTo(tr);
            td = $('<td>');
            td.addClass('table-cell border bold')
            td.text('Search term');
            td.appendTo(tr);
            td = $('<td>');
            td.addClass('table-cell border bold')
            td.text('Save');
            td.appendTo(tr);
            tr.appendTo(table);
          }
          tr = $('<tr>');
          tr.addClass('table-row');
          td = $('<td>');
          td.addClass('table-cell border');
          td.text(id);
          td.appendTo(tr);
          td = $('<td>');
          td.addClass('table-cell border');
          td.text(research.what);
          td.appendTo(tr);
          td = $('<td>');
          td.addClass('table-cell border');
          td.text(research.searchTerm);
          td.appendTo(tr);
          td = $('<td>');
          td.addClass('table-cell border');
          img = $('<img>');
          img.attr('src', '/img/ic_save.png');
          img.click(function() {
            showSaveResearch(research, $(this).offset());
          });
          img.appendTo(td);
          td.appendTo(tr);
          tr.appendTo(table);
        }

        function showExamine(statusObj, offset) {
          showWin('examine', offset);
          $('#exStatus').text(statusObj.status);
          if (statusObj.status == 'Passed') {
            $('#exStatus').addClass('passed');
          } else {
            $('#exStatus').addClass('failed');
            $('#exDescName').text('Failure reason:');
            $('#exDescValue').text(statusObj.reason);
          }
          $('#exq_query').click(function() {
            if ($('#exq').val().length == 0) {
              error('Description cannot be empty');
              return false;
            }
            hideWin('examine');
            runExamineQuery( $('#exq').val(), statusObj.ids);
            return false;
          });
        }

        function findStep(id) {
          var s = null;
          prevSteps.forEach(function (step) {
            if (step.id == id) {
              s = step;
            }
          });
          return s;
        }
      });

      function hideWin(id) {
        $('#' + id).css('visibility', 'hidden');
      }

      function showWin(id, offset) {
        $('#' + id).css('visibility', 'visible');
        $('#' + id).css('left', offset.left + 50);
        $('#' + id).css('top', offset.top - 20);
      }

      function showBusy() {
        isAjaxActive = true;
        setTimeout(function() {
          if (isAjaxActive) {
            $( "#busy" ).show();
          }
        }, 500);
      }

      function hideBusy() {
        isAjaxActive = false;
        $( "#busy" ).hide();
      }