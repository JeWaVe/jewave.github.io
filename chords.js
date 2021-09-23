function chords() {
    document.getElementById("content").innerHTML = "";

    const color = d3.scaleOrdinal(d3.schemeCategory20);



    var svg = d3.select("#content")
        .append("svg")
        .attr("width", 700)
        .attr("height", 700)
        .append("g")
        .attr("transform", "translate(350,350)")
    const innerRadius = 250;
    const outerRadius = 270;

    d3.json("./full_graph.json", function (error, graph) {
        if (error) throw error;

        sanitize(graph);
        let root = hierarchy(graph);
        let node_dict = {};
        const categories = make_categories(root, node_dict);
        const matrix = compute_matrix(graph.links, node_dict, categories.length);
        const res = d3.chord()
            .padAngle(0.05)
            .sortSubgroups(d3.descending)
            (matrix);

        let groups = svg
            .datum(res)
            .append("g")
            .selectAll("g")
            .data(function (d) { return d.groups; })
            .enter()
            .append("g");
        groups
            .append("path")
            .style("fill", "grey")
            .style("stroke", "black")
            .attr("d", d3.arc()
                .innerRadius(innerRadius)
                .outerRadius(outerRadius)
            );

        groups.append("svg:text")
            .each(function (d) { d.angle = (d.startAngle + d.endAngle) / 2; })
            .attr("dy", ".35em")
            .attr("class", "titles")
            .attr("text-anchor", function (d) { return d.angle > Math.PI ? "end" : null; })
            .attr("transform", function (d) {
                return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
                    + "translate(" + (innerRadius + 25) + ")"
                    + (d.angle > Math.PI ? "rotate(180)" : "");
            })
            .attr('opacity', 1)
            .style("font-size", "10px")
            .text(function (d, i) { return categories[i]; });

        var tooltip = d3.select("#content")
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "1px")
            .style("border-radius", "5px")
            .style("padding", "10px");

        var showTooltip = function (d) {
            tooltip
                .style("opacity", 1)
                .html("Source: " + categories[d.source.index] + "<br>Target: " + categories[d.target.index])
                .style("left", (d3.event.pageX + 15) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        }

        // A function that change this tooltip when the leaves a point: just need to set opacity to 0 again
        var hideTooltip = function (d) {
            tooltip.style("opacity", 0);
        }

        svg
            .datum(res)
            .append("g")
            .selectAll("path")
            .data(function (d) { return d; })
            .enter()
            .append("path")
            .attr("d", d3.ribbon()
                .radius(innerRadius - 5)
            )
            .style("fill", "#69b3a2")
            .style("stroke", "black")
            .on("mouseover", showTooltip)
            .on("mouseout", hideTooltip);
    });

    function compute_matrix(links, node_dict, count) {
        var result = [];
        for (let i = 0; i < links.length; ++i) {
            const l = links[i];
            if (node_dict.hasOwnProperty(l.source) && node_dict.hasOwnProperty(l.target)) {
                var sourceCat = node_dict[l.source].parent.categoryIndex;
                var targetCat = node_dict[l.target].parent.categoryIndex;
                if (result[sourceCat] === undefined) {
                    result[sourceCat] = new Array(count).fill(0);;
                }
                if (result[sourceCat][targetCat] === undefined) {
                    result[sourceCat][targetCat] = 0;
                }
                result[sourceCat][targetCat] += 1.
            }
        }

        return result;
    }

    function make_categories(n, node_dict) {
        let catIndex = 0;
        let categories = [];
        n.children = n.children.filter(r => r.leaves().length > 1);
        for (let i = 0; i < n.children.length; ++i) {
            let rank = n.children[i];
            rank.children = rank.children.filter(o => o.leaves().length > 1);
            for (let j = 0; j < rank.children.length; ++j) {
                let office = rank.children[j];
                office.children = office.children.filter(j => j.leaves().length > 1);
                for (let k = 0; k < office.children.length; ++k) {
                    let job = office.children[k];
                    categories.push(job.data.name);
                    job.categoryIndex = catIndex++;
                    for (let p = 0; p < job.children.length; ++p) {
                        const guy = job.children[p];
                        node_dict[guy.data.id] = guy;
                    }
                }
            }
        }

        return categories;
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

        return d3.hierarchy(map["root"]);
    }
}