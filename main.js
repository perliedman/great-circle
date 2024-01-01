import * as d3 from "d3";
import coastlines from "./world.json";
import airports from "./airports.json";

const EARTH_RADIUS = 6371;
const containerRect = d3.select("#map").node().getBoundingClientRect();
let width = containerRect.width;
let height = containerRect.height;
const sensitivity = 75;

let projection = d3
  .geoOrthographic()
  .scale(width * 0.45)
  .center([0, 0])
  .rotate([0, 0])
  .translate([width / 2, height / 2]);

const initialScale = projection.scale();
let path = d3.geoPath().projection(projection);

let svg = d3
  .select("#map")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

let globe = svg
  .append("circle")
  .attr("fill", "url(#ocean_fill)")
  .attr("stroke", "white")
  .attr("stroke-width", "2")
  .attr("cx", width / 2)
  .attr("cy", height / 2)
  .attr("r", initialScale);

svg
  .call(
    d3.drag().on("drag", (e) => {
      const rotate = projection.rotate();
      const k = sensitivity / projection.scale();
      projection.rotate([rotate[0] + e.dx * k, rotate[1] - e.dy * k]);
      path = d3.geoPath().projection(projection);
      svg.selectAll("path").attr("d", path);
    })
  )
  .call(
    d3.zoom().on("zoom", (e) => {
      if (e.transform.k > 0.3) {
        projection.scale(initialScale * e.transform.k);
        path = d3.geoPath().projection(projection);
        svg.selectAll("path").attr("d", path);
        globe.attr("r", projection.scale());
      } else {
        e.transform.k = 0.3;
      }
    })
  );

let map = svg.append("g");
let waypointsOverlay = svg.append("g");
let routeOverlay = svg.append("g");

const waypoints = [];
function addWaypoint(coord) {
  waypoints.push(coord);

  waypointsOverlay
    .selectAll("path")
    .data(waypoints.map((d) => ({ type: "Point", coordinates: d })))
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "red")
    .attr("stroke-width", 2);

  let route = [];
  if (waypoints.length === 2) {
    const [source, target] = waypoints;
    route = { type: "LineString", coordinates: [source, target] };
    waypoints.splice(0, 2);
    const distance = d3.geoDistance(source, target) * EARTH_RADIUS;
    const outputs = [
      `${distance.toFixed(0)} km`,
      `${(distance / 1.852).toFixed(0)} nm`,
      `${(distance / 1.609344).toFixed(0)} miles`,
    ];

    const update = d3.select("#route-distance").selectAll("p").data(outputs);

    const enter = update.enter().append("p");
    const exit = update.exit().remove();
    enter.merge(update).text((d) => d);
  }
  routeOverlay
    .selectAll("path")
    .data([route])
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "red")
    .attr("stroke-width", 2);

  svg.selectAll("path").attr("d", path);
}

svg.on("click", (e) => {
  const coord = projection.invert(d3.pointer(e));
  addWaypoint(coord);
});

const graticuleOverlay = svg.append("g");
graticuleOverlay
  .selectAll("path")
  .data([d3.geoGraticule10()])
  .enter()
  .append("path")
  .attr("d", path)
  .style("fill", "none")
  .style("stroke", "black")
  .style("stroke-width", 0.4)
  .style("opacity", 0.15);

map
  .append("g")
  .attr("class", "countries")
  .selectAll("path")
  .data(coastlines.features)
  .enter()
  .append("path")
  .attr("class", (d) => "country_" + d.properties.name.replace(" ", "_"))
  .attr("d", path)
  .attr("fill", "#f0f0f0")
  .style("stroke", "black")
  .style("stroke-width", 0.6)
  .style("opacity", 0.4);

d3.select("#search-options")
  .selectAll("option")
  .data(airports.features)
  .enter()
  .append("option")
  .attr("value", (d) => d.properties.name)
  .text((d) => `${d.properties.iata} / ${d.properties.icao}`);

const search = d3.select("#search-input");
search.on("change", (e) => {
  const airport = airports.features.find(
    (d) => d.properties.name === e.target.value
  );
  if (!airport) return;
  search.property("value", "");
  const coord = airport.geometry.coordinates;
  addWaypoint(coord);
});

// const rotate = projection.rotate();
// const k = sensitivity / projection.scale();
// projection.rotate([-80, -45]);
// path = d3.geoPath().projection(projection);
// svg.selectAll("path").attr("d", path);

//Optional rotate
// d3.timer(function (elapsed) {
//   const rotate = projection.rotate();
//   const k = sensitivity / projection.scale();
//   projection.rotate([rotate[0] - 1 * k, rotate[1]]);
//   path = d3.geoPath().projection(projection);
//   svg.selectAll("path").attr("d", path);
// }, 200);
