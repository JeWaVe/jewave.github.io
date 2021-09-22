
function display(input) {
    d3.json(input, function (graph) {
        document.getElementById("content").innerHTML = "";
        const nodes = graph.nodes;
        let links = [];
        // sanitize links
        graph.links.forEach((l, index) => {
            if (l.source !== l.target) {
                links.push(l);
            }
        });

        function get_job(node) {
            return node.job.concat(node.rank).join(',');
        }

        // preprocess
        let node_indices = {};
        nodes.forEach((node, index) => {
            node_indices[node.id] = index;
            node.outlinks = 0;
        });
        links.forEach((link, index) => {
            let source = nodes[node_indices[link.source]];
            source.outlinks += 1;
        });
        let maxRadius = 0;
        nodes.forEach((node, index) => {
            node.r = 5 * Math.log(node.outlinks + 2);
            maxRadius = Math.max(maxRadius, node.r);
        });

        // separation between same-color circles
        const padding = 9; // 1.5

        // separation between different-color circles
        const clusterPadding = 120; // 6


        const z = d3.scaleOrdinal(d3.schemeCategory20);

        // total number of nodes
        const n = nodes.length;

        // detect communities with jsLouvain
        var nodeData = nodes.map(function (d) { return d.id });
        var linkData = links.map(function (d) { return { source: d.source, target: d.target, weight: d.weight }; });

        var community = jLouvain()
            .nodes(nodeData)
            .edges(linkData);

        var result = community();

        nodes.forEach(function (node) {
            node.cluster = result[node.id]
        });

        // collect clusters from nodes
        const clusters = {};
        nodes.forEach((node) => {
            const radius = node.r;
            const clusterID = node.cluster;
            if (!clusters[clusterID] || (radius > clusters[clusterID].r)) {
                clusters[clusterID] = node;
            }
        });

        const svg = d3.select('#content')
            .append('svg')
            .attr('height', height)
            .attr('width', width)
            .call(d3.zoom().on("zoom", function () {
                svg.attr("transform", d3.event.transform);
            }));

        let jobs = {};
        nodes.forEach((n, index) => {
            const job = n.job;
            const rank = n.rank;
            const label = get_job(n);
            if (!jobs.hasOwnProperty(label)) {
                jobs[label] = true;
            }
        });

        jobs = Object.keys(jobs);

        // Add one dot in the legend for each name.
        var legend = svg.selectAll("mydots")
            .data(jobs)
            .enter()
            .append('g');
        var focus_job = false;
        legend.on('click', d => {
            if (focus_job) {
                focus_job = false;
                d3.selectAll("g.node").attr("class", "node opaque");
                d3.selectAll("line").attr("class", "opaque");
            } else {
                // reset
                focusNode = false;
                focus_job = true;
                focusLinks = [];
                d3.selectAll("g.node").attr("class", "node transparent");
                d3.selectAll("line").attr("class", "transparent");
                d3.selectAll("line").select(function (l) {
                    const source = nodes[node_indices[l.source.id]];
                    const target = nodes[node_indices[l.target.id]];
                    const source_job = get_job(source);
                    const target_job = get_job(target);

                    if (source_job == d || target_job == display) {
                        focusLinks.push(l);
                        d3.select(this).attr("class", "opaque");
                    }
                });
                d3.selectAll("g.node").select(function (c) {
                    var self = this;
                    focusLinks.forEach(function (n) {
                        if (n.source.id == c.id || n.target.id == c.id) {
                            d3.select(self).attr("class", "node opaque");
                        }
                    });
                });
            }
        });

        legend
            .append("circle")
            .attr("cx", 100)
            .attr("cy", function (d, i) { return 100 + i * 25 }) // 100 is where the first dot appears. 25 is the distance between dots
            .attr("r", 7)
            .style("fill", function (d) { return z(d) })

        // Add one dot in the legend for each name.
        legend
            .append("text")
            .attr("x", 120)
            .attr("y", function (d, i) { return 100 + i * 25 }) // 100 is where the first dot appears. 25 is the distance between dots
            .style("fill", function (d) { return z(d) })
            .text(function (d) { return d })
            .attr("text-anchor", "left")
            .style("alignment-baseline", "bottom");

        svg
            .append('defs')
            .append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', [0, 0, 8, 8])
            .attr('refX', 4)
            .attr('refY', 4)
            .attr('markerWidth', 8)
            .attr('markerHeight', 8)
            .attr('orient', 'auto-start-reverse')
            .append('path')
            .attr('d', d3.line()([[0, 0], [0, 8], [8, 4]]))
            .attr('stroke', 'black')
            .attr('fill', 'black');

        const mainGroup = svg
            .append('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);

        let link = mainGroup.selectAll('line')
            .data(links)
            .enter().append('line');

        link
            .attr('class', 'link')
            .style('stroke', 'black')
            .style('stroke-width', '1px')
            .attr('marker-end', 'url(#arrow)');

        const group = mainGroup.append('g')
            .datum(nodes)
            .selectAll('.circle')
            .data(d => d)
            .enter().append('g').attr("class", "node");

        var focusLinks = [];
        var focusNode = false;
        group.on("click", function (d) {
            focusLinks = [];
            var current = this;
            if (focusNode) {
                focusNode = false;
                d3.selectAll("g.node").attr("class", "node opaque");
                d3.selectAll("line").attr("class", "opaque");
            }
            else {
                focusNode = true;
                d3.selectAll("g.node").attr("class", "node transparent");
                d3.selectAll("line").attr("class", "transparent");
                d3.select(current).attr("class", "node opaque");
                d3.selectAll("line").select(function (l) {
                    if (l.source.id == d.id || l.target.id == d.id) {
                        focusLinks.push(l);
                        d3.select(this).attr("class", "opaque");
                    }
                });
                d3.selectAll("g.node").select(function (c) {
                    var self = this;
                    focusLinks.forEach(function (n) {
                        if (n.source.id == c.id || n.target.id == c.id) {
                            d3.select(self).attr("class", "node opaque");
                        }
                    });
                });
            }
        });

        const circles = group
            .append('circle')
            .attr('r', d => d.r)
            .attr('fill', d => z(get_job(d)))
            .attr('stroke', 'black')
            .attr('stroke-width', 1);

        let texts = group.append("text")
            .text(function (d) {
                return d.id;
            }).attr('text-anchor', 'middle').attr('alignment-baseline', 'middle');


        group.append("title")
            .text(function (d) { return d.name + "(" + d.job.join(",") + " -- " + d.rank.join(',') + ")"; });

        circles
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended)
            );

        const simulation = d3.forceSimulation()
            .nodes(nodes)
            .force('link', d3.forceLink().id(d => d.id))
            .velocityDecay(0.2)
            .force('x', d3.forceX().strength(0.5))
            .force('y', d3.forceY().strength(0.5))
            .force('collide', collide)
            .force('cluster', clustering)
            .force('collision', d3.forceCollide().radius(function (d) {
                return d.r + 6;
            }))
            .on('tick', ticked);

        var k = Math.sqrt(nodes.length / (width * height));

        simulation.force('link')
            .links(links);

        function ticked() {
            link
                .attr('x1', d => {
                    let l = Math.sqrt((d.target.x - d.source.x) * (d.target.x - d.source.x) + (d.target.y - d.source.y) * (d.target.y - d.source.y));


                    let ux = (d.target.x - d.source.x) / l;
                    let uy = (d.target.y - d.source.y) / l;


                    var r = nodes[node_indices[d.source.id]].r;
                    return d.source.x + ux * r;
                })
                .attr('y1', d => {
                    let l = Math.sqrt((d.target.x - d.source.x) * (d.target.x - d.source.x) + (d.target.y - d.source.y) * (d.target.y - d.source.y));

                    let ux = (d.target.x - d.source.x) / l;
                    let uy = (d.target.y - d.source.y) / l;

                    var r = nodes[node_indices[d.source.id]].r;
                    return d.source.y + uy * r;
                })
                .attr('x2', d => {
                    let l = Math.sqrt((d.target.x - d.source.x) * (d.target.x - d.source.x) + (d.target.y - d.source.y) * (d.target.y - d.source.y));

                    let ux = (d.target.x - d.source.x) / l;
                    let uy = (d.target.y - d.source.y) / l;
                    return d.target.x - ux * nodes[node_indices[d.target.id]].r;
                })
                .attr('y2', d => {
                    let l = Math.sqrt((d.target.x - d.source.x) * (d.target.x - d.source.x) + (d.target.y - d.source.y) * (d.target.y - d.source.y));

                    let ux = (d.target.x - d.source.x) / l;
                    let uy = (d.target.y - d.source.y) / l;
                    var r = nodes[node_indices[d.target.id]].r;
                    return d.target.y - uy * r;
                });

            circles
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
            texts
                .attr('x', d => d.x)
                .attr('y', d => d.y);

        }

        function dragstarted(d) {
            if (!d3.event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
        }

        function dragended(d) {
            if (!d3.event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        // These are implementations of the custom forces
        function clustering(alpha) {
            nodes.forEach((d) => {
                const cluster = clusters[d.cluster];
                if (cluster === d) return;
                let x = d.x - cluster.x;
                let y = d.y - cluster.y;
                let l = Math.sqrt((x * x) + (y * y));
                const r = d.r + cluster.r;
                if (l !== r) {
                    l = ((l - r) / l) * alpha;
                    d.x -= x *= l;
                    d.y -= y *= l;
                    cluster.x += x;
                    cluster.y += y;
                }
            });
        }

        function collide(alpha) {
            const quadtree = d3.quadtree()
                .x(d => d.x)
                .y(d => d.y)
                .addAll(nodes);

            nodes.forEach((d) => {
                const r = d.r + maxRadius + Math.max(padding, clusterPadding);
                const nx1 = d.x - r;
                const nx2 = d.x + r;
                const ny1 = d.y - r;
                const ny2 = d.y + r;
                quadtree.visit((quad, x1, y1, x2, y2) => {
                    if (quad.data && (quad.data !== d)) {
                        let x = d.x - quad.data.x;
                        let y = d.y - quad.data.y;
                        let l = Math.sqrt((x * x) + (y * y));
                        const r = d.r + quad.data.r + (d.cluster === quad.data.cluster ? padding : clusterPadding);
                        if (l < r) {
                            l = ((l - r) / l) * alpha;
                            d.x -= x *= l;
                            d.y -= y *= l;
                            quad.data.x += x;
                            quad.data.y += y;
                        }
                    }
                    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
                });
            });
        }
    });
}