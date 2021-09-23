function display_full() {
    document.getElementById("content").innerHTML = "";
    var diameter = 960,
        radius = diameter / 2,
        innerRadius = radius - 120;

    const color = d3.scaleOrdinal(d3.schemeCategory20);

    var cluster = d3.cluster()
        .size([360, innerRadius]);

    var line = d3.radialLine()
        .curve(d3.curveBundle.beta(0.85))
        .radius(function (d) { return d.y; })
        .angle(function (d) { return d.x / 180 * Math.PI; });


    var svg = d3.select("#content").append("svg")
        .attr("width", diameter + 300)
        .attr("height", diameter + 300);

    var diagram = svg
        .append("g")
        .attr("transform", "translate(" + (radius + 200) + "," + (radius) + ")");


    var link = diagram.append("g").selectAll(".link"),
        node = diagram.append("g").selectAll(".node");

    var witness = svg.append("g").attr("class", "legend").attr("data-legend", "witness");
    witness.append("circle").attr("cx", 10).attr("cy", 30).attr("r", 6).style("fill", "red");
    witness.append("text").attr("x", 30).attr("y", 35).text("Témoin de").style("font-size", "15px").attr("alignment-baseline", "middle");
    var cowitness = svg.append("g").attr("class", "legend").attr("data-legend", "cowitness");
    cowitness.append("circle").attr("cx", 10).attr("cy", 50).attr("r", 6).style("fill", "blue");
    cowitness.append("text").attr("x", 30).attr("y", 55).text("Témoin avec").style("font-size", "15px").attr("alignment-baseline", "middle");
    var overbid = svg.append("g").attr("class", "legend").attr("data-legend", "overbid");
    overbid.append("circle").attr("cx", 10).attr("cy", 70).attr("r", 6).style("fill", "black");
    overbid.append("text").attr("x", 30).attr("y", 75).text("Enchérit sur").style("font-size", "15px").attr("alignment-baseline", "middle");
    var cobid = svg.append("g").attr("class", "legend").attr("data-legend", "cobid");
    cobid.append("circle").attr("cx", 10).attr("cy", 90).attr("r", 6).style("fill", "yellow");
    cobid.append("text").attr("x", 30).attr("y", 95).text("Enchérit avec").style("font-size", "15px").attr("alignment-baseline", "middle");
    var winner = svg.append("g").attr("class", "legend").attr("data-legend", "won");
    winner.append("circle").attr("cx", 10).attr("cy", 110).attr("r", 6).style("fill", "green");
    winner.append("text").attr("x", 30).attr("y", 115).text("Vainqueur sur").style("font-size", "15px").attr("alignment-baseline", "middle");

    function degToRad(d) {
        return d / 180 * Math.PI;
    }

    function findStartAngle(children) {
        var min = children[0].x;
        children.forEach(function (d) {
            if (d.x < min)
                min = d.x;
        });
        return degToRad(min);
    }

    function findEndAngle(children) {
        var max = children[0].x;
        children.forEach(function (d) {
            if (d.x > max)
                max = d.x;
        });
        return degToRad(max);
    }

    d3.json("./full_graph.json", function (error, graph) {
        if (error) throw error;

        sanitize(graph);

        d3.selectAll("g.legend").on("mouseover", legendovered).on("mouseout", legendout);
        var root = hierarchy(graph);
        cluster(root);

        link = link
            .data(build_path(root.leaves(), graph.links))
            .enter().append("path")
            .each(d => { d.source = d[0], d.target = d[d.length - 1]; })
            .attr("class", "link")
            .attr("d", line);
        const getArc = function (ir, or) {
            return d3.arc()
                .innerRadius(ir)
                .outerRadius(or)
                .startAngle(function (d) {
                    return findStartAngle(d.leaves());
                })
                .endAngle(function (d) {
                    return findEndAngle(d.leaves());
                });
        };

        let id = 0;
        for (let i = 0; i < root.children.length; ++i) {
            const rank = root.children[i];
            if (rank.leaves().length >= 2) {
                const arc = getArc(innerRadius, innerRadius + 10)(rank);
                svg.append("path")
                    .attr("id", "path" + id)
                    .attr("d", arc)
                    .attr("data-category", rank.data.name)
                    .attr("stroke", color(rank.data.name))
                    .attr("fill", color(rank.data.name))
                    .attr("transform", "translate(" + (radius + 200) + "," + (radius) + ")")
                    .on("mouseover", categoryovered)
                    .on("mouseout", categoryout);
                svg.append("text")
                    .attr("dy", 8)
                    .append("textPath")
                    .attr("class", "category")
                    .attr("xlink:href", "#path" + id++)
                    .text(rank.data.name);
                for (let j = 0; j < rank.children.length; ++j) {
                    const office = rank.children[j];
                    if (office.leaves().length >= 2) {
                        const arc = getArc(innerRadius + 10, innerRadius + 20)(office);
                        svg.append("path")
                            .attr("id", "path" + id)
                            .attr("d", arc)
                            .attr("data-category", office.data.name)
                            .attr("stroke", color(office.data.name))
                            .attr("fill", color(office.data.name))
                            .attr("transform", "translate(" + (radius + 200) + "," + (radius) + ")")
                            .on("mouseover", categoryovered)
                            .on("mouseout", categoryout);
                        svg.append("text")
                            .attr("dy", 8)
                            .append("textPath")
                            .attr("class", "category")
                            .attr("xlink:href", "#path" + id++)
                            .text(office.data.name.substring((rank.data.name + " ").length));
                        for (let k = 0; k < office.children.length; ++k) {
                            const job = office.children[k];
                            if (job.leaves().length >= 2) {
                                const arc = getArc(innerRadius + 20, innerRadius + 30)(job);
                                svg.append("path")
                                    .attr("id", "path" + id)
                                    .attr("d", arc)
                                    .attr("data-category", job.data.name)
                                    .attr("stroke", color(job.data.name))
                                    .attr("fill", color(job.data.name))
                                    .attr("transform", "translate(" + (radius + 200) + "," + (radius) + ")")
                                    .on("mouseover", categoryovered)
                                    .on("mouseout", categoryout);
                                svg.append("text")
                                    .attr("dy", 8)
                                    .append("textPath")
                                    .attr("class", "category")
                                    .attr("xlink:href", "#path" + id++)
                                    .text(job.data.name.substring(office.data.name.length + 1));
                            }
                        }
                    }
                }
            }
        }

        node = node
            .data(root.leaves())
            .enter().append("text")
            .attr("class", "chord_node")
            .attr("dy", "0.31em")
            .attr("transform", function (d) { return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 38) + ",0)" + (d.x < 180 ? "" : "rotate(180)"); })
            .attr("text-anchor", function (d) { return d.x < 180 ? "start" : "end"; })
            .text(function (d) { return d.data.name; })
            .on("mouseover", mouseovered)
            .on("mouseout", mouseouted);


        window.myroot = root;

        function categoryovered() {

            let catnode = find_cat_node(root, d3.select(this).attr("data-category"));
            let leaves = catnode.leaves();
            link.classed("link--witness", l => l.label == 0 && leaves.find(n => n.data.id == l.source.data.id))
                .classed("link--cowitness", l => l.label == 1 && leaves.find(n => n.data.id == l.source.data.id))
                .classed("link--cobid", l => l.label == 2 && leaves.find(n => n.data.id == l.source.data.id))
                .classed("link--overbid", l => l.label == 3 && leaves.find(n => n.data.id == l.source.data.id))
                .classed("link--won", l => l.label == 4 && leaves.find(n => n.data.id == l.source.data.id))
                .classed("link--hidden", l => !leaves.find(n => n.data.id == l.source.data.id));

        }

    });

    const label_dict = {
        "witness": 0,
        "cowitness": 1,
        "cobid": 2,
        "overbid": 3,
        "won": 4
    };

    function find_cat_node(node, name) {
        if (node.data.name === name) {
            return node;
        }
        if (!node.children || node.children.length === 0) {
            return null;
        }
        for (let i = 0; i < node.children.length; ++i) {
            let result = find_cat_node(node.children[i], name);
            if (result != null) {
                return result;
            }
        }
    }

    function categoryout() {
        link
            .classed("link--witness", false)
            .classed("link--cobid", false)
            .classed("link--cowitness", false)
            .classed("link--overbid", false)
            .classed("link--won", false)
            .classed("link--hidden", false);

        node
            .classed("chord_node--target", false)
            .classed("chord_node--source", false);
    }

    function legendovered() {
        var element = this;
        const label = d3.select(element).attr("data-legend");
        link.classed("link--" + label, l => l.label == label_dict[label])
            .classed("link--hidden", l => l.label != label_dict[label]);
    }

    function legendout() {
        link
            .classed("link--witness", false)
            .classed("link--cobid", false)
            .classed("link--cowitness", false)
            .classed("link--overbid", false)
            .classed("link--won", false)
            .classed("link--hidden", false);

        node
            .classed("chord_node--target", false)
            .classed("chord_node--source", false);
    }

    function mouseovered(d) {
        node
            .each(function (n) { n.target = n.source = false; });

        link
            .classed("link--witness", function (l) { if (l.label == 0 && l.source === d) return l.target.target = true; })
            .classed("link--cowitness", function (l) { if (l.label == 1 && l.source === d) return l.target.target = true; })
            .classed("link--cobid", function (l) { if (l.label == 2 && l.source === d) return l.target.target = true; })
            .classed("link--overbid", function (l) { if (l.label == 3 && l.source === d) return l.target.target = true; })
            .classed("link--won", function (l) { if (l.label == 4 && l.source === d) return l.target.target = true; })

            .classed("link--witness", function (l) { if (l.label == 0 && l.target === d) return l.source.source = true; })
            .classed("link--cowitness", function (l) { if (l.label == 1 && l.target === d) return l.source.source = true; })
            .classed("link--cobid", function (l) { if (l.label == 2 && l.target === d) return l.source.source = true; })
            .classed("link--overbid", function (l) { if (l.label == 3 && l.target === d) return l.source.source = true; })
            .classed("link--won", function (l) { if (l.label == 4 && l.target === d) return l.source.source = true; })
            .classed("link--hidden", function (l) { return l.source != d && l.target != d; }).raise();

        node
            .classed("chord_node--target", function (n) { return n.target; })
            .classed("chord_node--source", function (n) { return n.source; });
    }

    function mouseouted(d) {
        link
            .classed("link--cobid", false)
            .classed("link--cowitness", false)
            .classed("link--witness", false)
            .classed("link--overbid", false)
            .classed("link--won", false)
            .classed("link--hidden", false);

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
            const office = rank + " " + (n.offices.join(',') || "no office");
            const job = office + " " + (n.job.join(',') || "no job");
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