function display_full() {
    document.getElementById("content").innerHTML = "";
    var diameter = 960,
        radius = diameter / 2,
        innerRadius = radius - 120;

    var cluster = d3.cluster()
        .size([360, innerRadius]);

    var line = d3.radialLine()
        .curve(d3.curveBundle.beta(0.85))
        .radius(function (d) { return d.y; })
        .angle(function (d) { return d.x / 180 * Math.PI; });


    var svg = d3.select("#content").append("svg")
        .attr("width", diameter)
        .attr("height", diameter)
        .append("g")
        .attr("transform", "translate(" + radius + "," + radius + ")");


    var link = svg.append("g").selectAll(".link"),
        node = svg.append("g").selectAll(".node");

    svg.append("circle").attr("cx", 200).attr("cy", 130).attr("r", 6).style("fill", "red");
    svg.append("text").attr("x", 220).attr("y", 130).text("Témoin de").style("font-size", "15px").attr("alignment-baseline", "middle");
    svg.append("circle").attr("cx", 200).attr("cy", 160).attr("r", 6).style("fill", "blue");
    svg.append("text").attr("x", 220).attr("y", 160).text("Témoin avec").style("font-size", "15px").attr("alignment-baseline", "middle");
    svg.append("circle").attr("cx", 200).attr("cy", 190).attr("r", 6).style("fill", "black");
    svg.append("text").attr("x", 220).attr("y", 190).text("Enchérit sur").style("font-size", "15px").attr("alignment-baseline", "middle");
    svg.append("circle").attr("cx", 200).attr("cy", 220).attr("r", 6).style("fill", "yellow");
    svg.append("text").attr("x", 220).attr("y", 220).text("Enchérit avec").style("font-size", "15px").attr("alignment-baseline", "middle");
    svg.append("circle").attr("cx", 200).attr("cy", 250).attr("r", 6).style("fill", "green");
    svg.append("text").attr("x", 220).attr("y", 250).text("Vainqueur sur").style("font-size", "15px").attr("alignment-baseline", "middle");


    d3.json("./full_graph.json", function (error, graph) {
        if (error) throw error;

        sanitize(graph);

        var root = hierarchy(graph);
        cluster(root);

        link = link
            .data(build_path(root.leaves(), graph.links))
            .enter().append("path")
            .each(d => { d.source = d[0], d.target = d[d.length - 1]; })
            .attr("class", "link")
            .attr("d", line);

        node = node
            .data(root.leaves())
            .enter().append("text")
            .attr("class", "chord_node")
            .attr("dy", "0.31em")
            .attr("transform", function (d) { return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 8) + ",0)" + (d.x < 180 ? "" : "rotate(180)"); })
            .attr("text-anchor", function (d) { return d.x < 180 ? "start" : "end"; })
            .text(function (d) { return d.data.name; })
            .on("mouseover", mouseovered)
            .on("mouseout", mouseouted);
    });


    function mouseovered(d) {
        node
            .each(function (n) { n.target = n.source = false; });

        link
            .classed("link--witness", function (l) { if (l.label == 0 && l.source === d) return l.target.target = true; })
            .classed("link--cowitness", function (l) { if (l.label == 1 && l.source === d) return l.target.target = true; })
            .classed("link--cobid", function (l) { if (l.label == 2 && l.source === d) return l.target.target = true; })
            .classed("link--overbid", function (l) { if (l.label == 3 && l.source === d) return l.target.target = true; })
            .classed("link--won", function (l) { if (l.label == 4 && l.source === d) return l.target.target = true; })
            .filter(function (l) { return l.target === d || l.source === d; })
            .raise();

        node
            .classed("chord_node--target", function (n) { return n.target; })
            .classed("chord_node--source", function (n) { return n.source; });
    }

    function mouseouted(d) {
        link
            .classed("link--cobid", false)
            .classed("link--cowitness", false)
            .classed("link--cobid", false)
            .classed("link--overbid", false)
            .classed("link--won", false);

        node
            .classed("chord_node--target", false)
            .classed("chord_node--source", false);
    }

    function hierarchy(g) {
        var map = { "root": { name: "root", children: [] } };
        function contains(children, node) {
            for (let i = 0; i < children.length; ++i) {
                if (children[i].name == node.name) {
                    return true;
                }
            }

            return false;
        }

        g.nodes.forEach((n, index) => {
            const rank = n.rank.join(',') || "no rank";
            const office = rank + " " + n.offices.join(',') || "no office";
            const job = office + " " + n.job.join(',') || "no job";
            const name = n.id + " : " + n.name;
            if (!map.hasOwnProperty(rank)) {
                map[rank] = { name: rank, children: [], parent: map["root"] };
            }
            if (!map.hasOwnProperty(office)) {
                map[office] = { name: office, children: [], parent: map[rank] };
            }
            if (!map.hasOwnProperty(job)) {
                map[job] = { name: job, children: [], parent: map[office] };
            }
            if (!map.hasOwnProperty(name)) {
                map[name] = { name: name, id: n.id, children: [], parent: map[job] };
            }

            if (!contains(map["root"].children, map[rank])) {
                map["root"].children.push(map[rank]);
            }
            if (!contains(map[rank].children, map[office])) {
                map[rank].children.push(map[office]);
            }

            if (!contains(map[office].children, map[job])) {
                map[office].children.push(map[job]);
            }

            if (!contains(map[job].children, map[name])) {
                map[job].children.push(map[name]);
            }
        });
        window.mymap = map;

        return d3.hierarchy(map["root"]);
    }

    // Return a list of imports for the given array of nodes.
    function build_path(leaves, links) {
        var map = {}, result = [];

        // Compute a map from name to node.
        leaves.forEach(l => {
            map[l.data.id] = l;
        });

        // For each import, construct a link from the source to target node.
        links.forEach(l => {
            path = map[l.source].path(map[l.target]);
            path.label = l.label;
            result.push(path);
        });

        return result;
    }
}