const fs = require("fs");
const { createCanvas } = require("canvas");
var clone = require("clone");


Array.prototype.sample = function (n = 1) {
    var ans = []
    let i

    for (i = 0; i < n; i++) {
        ans.push(this[Math.floor(Math.random() * this.length)])
    }

    if (n == 1) { ans = ans[0] }

    return clone(ans)
}

Array.prototype.weighted_sample = function (n, weights) {
    var i, ans = [];
    let rndArr = [];
    let ww = weights.slice(0, this.length);

    for (i = 0; i < ww.length; i++) {
        for (j = 0; j < ww[i]; j++) {
            rndArr.push(this[i])
        }
    }

    for (i = 0; i < n; i++) {
        ans.push(rndArr.sample())
    }

    if (n == 1) { ans = ans[0] }

    return clone(ans)
}

Array.prototype.findAllIndexes = function (value) {
    return clone(this.map((e, i) => e === value ? i : '').filter(String))
}

Array.prototype.remove = function (value) {
    return clone(this.filter(item => item !== value))
}

class TSPTour {
    constructor(tspRoute, tspDistance) {
        this.tspRoute = clone(tspRoute);
        this.tspDistance = tspDistance;
    }

    clone() {
        return (new TSPTour(clone(this.tspRoute), this.tspDistance))
    }
}

class TSPGeneticAlgorithm {
    constructor(generationSize = 1000, populationSize = 200, overProductionRate = 1.5, tournamentRate = 0.05, elitismRate = 0.05, crossoverRate = 1.0, mutationRate = 0.1) {
        this.generationSize = generationSize
        this.populationSize = populationSize
        this.overProductionRate = overProductionRate
        this.tournamentRate = tournamentRate
        this.elitismRate = elitismRate
        this.crossoverRate = crossoverRate
        this.mutationRate = mutationRate
        this.tspCities = []
        this.nextPopulation = []
        this.tspFileName = ''
        this.optimalDistance = 0
    }
    writeCSV(filename, data) {
        const csv = data.map(row => row.join(',')).join('\n');
        fs.appendFileSync(filename, csv + '\n');
    }

    getRandomIntInterval(min, max) {
        // The maximum is inclusive and the minimum is inclusive        
        const minCeiled = Math.ceil(min);
        const maxFloored = Math.floor(max);
        return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
    }

    ImportTSPFile(fileName, optimalDistance = 0) {
        const allData = fs.readFileSync(fileName, 'utf8');
        const allLines = allData.split('\n');
        let allCities = [], lineX, cityID, cityX, cityY;

        let allCityCoordinates = allLines.filter(x => ['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(x.trim()[0]))

        // Start reading from NODE_COORD_SECTION
        for (lineX of allCityCoordinates) {
            [cityID, cityX, cityY] = lineX.trim().split(/\s+/);
            allCities.push({ id: parseInt(cityID), x: parseFloat(cityX), y: parseFloat(cityY) });
        }
        this.tspCities = clone(allCities)
        this.optimalDistance = optimalDistance
        this.tspFileName = fileName

        console.log(` city => ${fileName} `)
        return(allCities)
    }

    DrawTSPTour(pngFileName, tspTour, pngMaxWidth = 1080, pngMaxHeight = 1080, lineWidth = 3) {
        let pngCanvas, pngContext, pngWidth, pngHeight;
        let pngPad = 50, minX, maxX, minY, maxY, pngScale;
        let pngCityCoordinates = [];
        let pngRouteCoordinates = [];
        let fitnessPercentage;

        minX = Math.min(...this.tspCities.map(x => x.x))
        maxX = Math.max(...this.tspCities.map(x => x.x))

        minY = Math.min(...this.tspCities.map(x => x.y))
        maxY = Math.max(...this.tspCities.map(x => x.y))

        pngScale = Math.max((maxX - minX) / (pngMaxWidth - 2 * pngPad), (maxY - minY) / (pngMaxHeight - 2 * pngPad));

        this.tspCities.forEach(cc =>
            pngCityCoordinates.push(
                {
                    id: cc.id,
                    x: (cc.x - minX) / pngScale + pngPad,
                    y: (cc.y - minY) / pngScale + pngPad
                }
            )
        );

        tspTour.tspRoute.forEach(cc => {
            pngRouteCoordinates.push(pngCityCoordinates[cc - 1])
        });


        maxX = Math.max(...pngRouteCoordinates.map(x => x.x)) + pngPad
        maxY = Math.max(...pngRouteCoordinates.map(x => x.y)) + pngPad

        pngCanvas = createCanvas(maxX, maxY);
        pngContext = pngCanvas.getContext("2d");
        pngContext.lineWidth = lineWidth;

        pngContext.fillStyle = "white";
        pngContext.fillRect(0, 0, maxX, maxY);

        pngContext.strokeStyle = "black";
        pngContext.beginPath();
        pngContext.moveTo(pngRouteCoordinates[0].x, pngCityCoordinates[0].y)
        pngRouteCoordinates.forEach(cc => {
            pngContext.lineTo(cc.x, cc.y)
        });
        pngContext.closePath()
        pngContext.stroke()

        pngContext.font = "20px verdana, sans-serif";
        pngRouteCoordinates.forEach(cc => {
            pngContext.beginPath();
            pngContext.arc(cc.x, cc.y, 10, 0, 2 * Math.PI);
            pngContext.fillStyle = "blue";
            pngContext.fill()

            pngContext.fillStyle = "green";
            pngContext.fillText(cc.id, cc.x - 10, cc.y - 10);
        })

        if (this.optimalDistance != 0) {
            fitnessPercentage = Math.round(tspTour.tspDistance / this.optimalDistance * 100, 2) - 100
        }

        pngContext.font = "30px verdana, sans-serif";
        pngContext.fillStyle = "brown";
        pngContext.fillText(`${Math.round(tspTour.tspDistance, 2)} (${fitnessPercentage}%)`, maxX / 2, pngPad);

        fs.writeFileSync(`${pngFileName}`, pngCanvas.toBuffer("image/png"));
    }

    CalculateDistanceBetweenTwoCities(idCityA, idCityB) {
        let dx, dy, distance;
        let cityA = this.tspCities[idCityA - 1];
        let cityB = this.tspCities[idCityB - 1];

        dx = cityB.x - cityA.x;
        dy = cityB.y - cityA.y;

        distance = Math.sqrt(dx * dx + dy * dy);

        return (distance)
    }

    CheckRoute(tspRoute) {
        let allCities = this.tspCities.map(x => x.id)
        let missedCities = allCities.filter(x => !tspRoute.includes(x));

        if (missedCities.length > 0) {
            console.log("Error")
        }
    }

    CalculateRouteDistance(tspRoute) {
        var totalDistance = 0;
        let i

        this.CheckRoute(tspRoute)

        for (i = 0; i < tspRoute.length - 1; i++) {
            totalDistance += this.CalculateDistanceBetweenTwoCities(tspRoute[i], tspRoute[i + 1])
        }

        totalDistance += this.CalculateDistanceBetweenTwoCities(tspRoute[tspRoute.length - 1], 1)

        return totalDistance
    }

    GenerateClosestCitiesTSPRoute(numCities, weights) {
        var allCitiesToVisit = Array(this.tspCities.length).fill(null).map((_, i) => i + 1);
        var tspRoute = [];
        var arrNextCities = [];
        let i, lastCity;

        tspRoute.push(allCitiesToVisit[0])
        allCitiesToVisit = allCitiesToVisit.remove(tspRoute[0])

        while (allCitiesToVisit.length > 0) {
            lastCity = tspRoute[tspRoute.length - 1]
            arrNextCities = []
            for (i = 0; i < allCitiesToVisit.length; i++) {
                arrNextCities.push({
                    'city': allCitiesToVisit[i],
                    'distance': this.CalculateDistanceBetweenTwoCities(lastCity, allCitiesToVisit[i])
                })
            }

            arrNextCities.sort((a, b) => a['distance'] - b['distance'])
            arrNextCities = arrNextCities.slice(0, numCities)
            tspRoute.push(arrNextCities.weighted_sample(1, weights)['city'])
            allCitiesToVisit = allCitiesToVisit.remove(tspRoute[tspRoute.length - 1])
        }
        return (clone(tspRoute))
    }

    AutoTubeParameters(parameters) {
       
        this.populationSize = parameters.populationSize || Math.round(this.tspCities.length / 50) * 50 * 1.5;
        this.generationSize = parameters.generationSize || this.populationSize * 10
        this.overProductionRate = parameters.overProductionRate || 1.5
        this.tournamentRate = parameters.tournamentRate || 0.05
        this.elitismRate = parameters.elitismRate || 0.05
        this.crossoverRate = parameters.crossoverRate || 1.0
        this.mutationRate =parameters.mutationRate || 0.1
    }

    GenerateInitialPopulationClosestCities(numCities = 3, weightCities = [1, 1, 1]) {
        let i, tspRoute, tspDistance, parent;
        let currentPopulation = []

        for (i = 0; i < Math.round(this.populationSize * this.overProductionRate); i++) {
            tspRoute = this.GenerateClosestCitiesTSPRoute(numCities, weightCities)
            tspDistance = this.CalculateRouteDistance(tspRoute)
            parent = new TSPTour(tspRoute, tspDistance)
            parent = this.DeepOptimize(parent)
            currentPopulation.push(parent)
        }

        currentPopulation.sort((a, b) => (a.tspDistance - b.tspDistance))
        currentPopulation = currentPopulation.slice(0, this.populationSize)
        return (currentPopulation)
        
    }

    AddFreshPopulation(nextPopulation,numFreshPopulation = -1) {
        let i, tspRoute, tspDistance, parentA;

        if (numFreshPopulation == -1) {
            numFreshPopulation = Math.round(this.elitismRate * this.populationSize)
        }

        for (i = 0; i < numFreshPopulation; i++) {
            tspRoute = this.GenerateClosestCitiesTSPRoute(2, [3, 1])
            tspDistance = this.CalculateRouteDistance(tspRoute)

            parentA = new TSPTour(tspRoute, tspDistance)
            parentA = this.DeepOptimize(parentA)
            nextPopulation.push(parentA)
            
        }
        return(nextPopulation)
    }

    TournamentSelection(currentPopulation) {
        let i, bestRoute, rndRoute;
        
        bestRoute = currentPopulation[Math.floor(Math.random() * currentPopulation.length)];

        for (i = 1; i < Math.round(this.tournamentRate * this.populationSize); i++) {
            rndRoute = currentPopulation[Math.floor(Math.random() * currentPopulation.length)];
            if (rndRoute.tspDistance < bestRoute.tspDistance) {
                bestRoute = rndRoute
            }
        }

        return (clone(bestRoute))
    }

    Elitism(currentPopulation) {
        
        let nextPopulation = [];
        for (let i = 0; i < Math.round(this.elitismRate * this.populationSize); i++) {
            clone(nextPopulation.push(currentPopulation[i]));
            
        }
        return nextPopulation;
    }

    Crossover(parentA, parentB) {
        let offspringA, offspringB, crossoverPoint;

        offspringA = clone(parentA);
        offspringB = clone(parentB);

        if (Math.random() < this.crossoverRate) {
            
            crossoverPoint = this.getRandomIntInterval(2, parentA.tspRoute.length - 3);
            offspringA.tspRoute = parentA.tspRoute.slice(0, crossoverPoint).concat(parentB.tspRoute.slice(crossoverPoint, parentA.tspRoute.length));
            offspringB.tspRoute = parentB.tspRoute.slice(0, crossoverPoint).concat(parentA.tspRoute.slice(crossoverPoint, parentB.tspRoute.length));
        }
        return ([offspringA, offspringB])
    }

    MutationSmart(parentA) {
        let offspringA, indexCityA, indexCityB, indexCityClosest, tt;
        let dist1, dist2;

        offspringA = clone(parentA);

        for (indexCityA = 2; indexCityA < offspringA.tspRoute.length - 1; indexCityA++) {
            if (Math.random() < this.mutationRate) {
                indexCityB = indexCityA;
                dist1 = this.CalculateDistanceBetweenTwoCities(offspringA.tspRoute[indexCityA - 1], offspringA.tspRoute[indexCityA])
                    + this.CalculateDistanceBetweenTwoCities(offspringA.tspRoute[indexCityA], offspringA.tspRoute[indexCityA + 1]);

                for (indexCityClosest = 2; indexCityClosest < offspringA.tspRoute.length; indexCityClosest++) {
                    if (indexCityClosest == indexCityA || indexCityClosest == indexCityA - 1 || indexCityClosest == indexCityA + 1) {
                        continue
                    }

                    dist2 = this.CalculateDistanceBetweenTwoCities(offspringA.tspRoute[indexCityA - 1], offspringA.tspRoute[indexCityClosest])
                        + this.CalculateDistanceBetweenTwoCities(offspringA.tspRoute[indexCityClosest], offspringA.tspRoute[indexCityA]);

                    if (dist2 < dist1) {
                        indexCityB = indexCityClosest;
                        dist1 = dist2
                    }
                }

                tt = offspringA.tspRoute[indexCityA]
                offspringA.tspRoute[indexCityA] = offspringA.tspRoute[indexCityB]
                offspringA.tspRoute[indexCityB] = tt
            }
        }

        return offspringA
    }

    Heal(tspTour) {
        let idAllCities = this.tspCities.map(x => x.id)
        let idRepeatedCities = tspTour.tspRoute.filter((e, i, a) => a.indexOf(e) !== i)
        let idMissedCities = idAllCities.filter(x => !tspTour.tspRoute.includes(x));

        let offspringA = clone(tspTour)
        let x1, x2

        idRepeatedCities.forEach(element => {
            x1 = offspringA.tspRoute.findAllIndexes(element).sample()
            x2 = idMissedCities.sample()
            offspringA.tspRoute[x1] = x2
            idMissedCities = idMissedCities.remove(x2)
        });

        return (offspringA)
    }

    DeepOptimize(tspTour) {
        let idCityA, idCityB, idCityC, idCityD;
        let i, j, x1, x2, x3, x4, y1, y2, y3, y4, x0, y0;
        let lineAB_a, lineAB_b, lineCD_a, lineCD_b;
        let arr1, arr2, arr3;
        let swapFlag = false
        let offspringA = clone(tspTour);

        offspringA.tspRoute.push(offspringA.tspRoute[0])

        for (i = 1; i < offspringA.tspRoute.length - 2; i++) {
            if (swapFlag) {
                swapFlag = false
            }

            for (j = i + 2; j < offspringA.tspRoute.length - 1; j++) {
                idCityA = offspringA.tspRoute[i];
                idCityB = offspringA.tspRoute[i + 1];

                x1 = this.tspCities[idCityA - 1].x
                y1 = this.tspCities[idCityA - 1].y

                x2 = this.tspCities[idCityB - 1].x
                y2 = this.tspCities[idCityB - 1].y

                lineAB_a = (y2 - y1) / (x2 - x1 + 0.00001)
                lineAB_b = y1 - lineAB_a * x1

                idCityC = offspringA.tspRoute[j];
                idCityD = offspringA.tspRoute[j + 1];

                x3 = this.tspCities[idCityC - 1].x
                y3 = this.tspCities[idCityC - 1].y

                x4 = this.tspCities[idCityD - 1].x
                y4 = this.tspCities[idCityD - 1].y

                lineCD_a = (y4 - y3) / (x4 - x3 + 0.00001)
                lineCD_b = y3 - lineCD_a * x3

                x0 = -(lineCD_b - lineAB_b) / (lineCD_a - lineAB_a)
                y0 = lineAB_a * x0 + lineAB_b

                if (Math.min(x1, x2) < x0 && Math.max(x1, x2) > x0 && Math.min(x3, x4) < x0 && Math.max(x3, x4) > x0) {
                    arr1 = offspringA.tspRoute.slice(0, i + 1);
                    arr2 = offspringA.tspRoute.slice(i + 1, j + 1);
                    arr3 = offspringA.tspRoute.slice(j + 1, offspringA.tspRoute.length);

                    offspringA.tspRoute = clone(arr1.concat(arr2.reverse()).concat(arr3));
                    swapFlag = true;
                    j--;
                    break;
                }
            }
        }

        offspringA.tspRoute = offspringA.tspRoute.slice(0, offspringA.tspRoute.length - 1)

        return offspringA
    }
  
    Solve(pngFolder = './',Population) {       
        
        let parentA, parentB;
        let offspringA1, offspringB1;
        let offspringA2, offspringB2;
        let offspringA, offspringB;
        let i, j, x1 = 0;
        let counterNoImprovement = 0;
        let pngFileName;

        let csvFilename = 'benchmark_data.csv'; 
        const startTime = new Date().getTime();
        for (i = 0; i <= this.generationSize && counterNoImprovement < this.populationSize; i++) {

            let nextPopulation = []
            nextPopulation = this.Elitism(Population)
            nextPopulation= this.AddFreshPopulation(nextPopulation)
            
            do {
                parentA = this.TournamentSelection(Population);
                do {
                    parentB = this.TournamentSelection(Population);
                } while (parentB.tspDistance == parentA.tspDistance)

                [offspringA1, offspringB1] = this.Crossover(parentA, parentB)
                offspringA1 = this.Heal(offspringA1)
                offspringB1 = this.Heal(offspringB1)

                offspringA2 = this.MutationSmart(offspringA1)
                offspringB2 = this.MutationSmart(offspringB1)

                offspringA = this.DeepOptimize(offspringA2)
                offspringB = this.DeepOptimize(offspringB2)

                offspringA.tspDistance = this.CalculateRouteDistance(offspringA.tspRoute)
                offspringB.tspDistance = this.CalculateRouteDistance(offspringB.tspRoute)

                if (offspringA.tspDistance != parentA.tspDistance && offspringA.tspDistance != parentB.tspDistance) {
                    nextPopulation.push(offspringA)
                }

                if (offspringB.tspDistance != parentA.tspDistance && offspringB.tspDistance != parentB.tspDistance) {
                    nextPopulation.push(offspringB)
                }

            } while (nextPopulation.length < Math.round(this.populationSize * this.overProductionRate));
            
            nextPopulation.sort((a, b) => (a.tspDistance - b.tspDistance))
            for (j = 0; j < nextPopulation.length - 1; j++) {
                if (nextPopulation[j].tspDistance == nextPopulation[j + 1].tspDistance) {
                    nextPopulation = nextPopulation.slice(0, j).concat(nextPopulation.slice(j + 1, nextPopulation.length))
                    j--;
                }
            }

            if (nextPopulation.length < this.populationSize) {
                x1 = this.populationSize - nextPopulation.length
                
                nextPopulation = this.AddFreshPopulation(nextPopulation,x1 * 1.5)
                nextPopulation.sort((a, b) => (a.tspDistance - b.tspDistance))
                nextPopulation = nextPopulation.slice(0, this.populationSize)
            }

            nextPopulation = nextPopulation.slice(0, this.populationSize)
       
            if (nextPopulation[0].tspDistance == Population[0].tspDistance) {
                counterNoImprovement++;
            } else {
                counterNoImprovement = 0;
            }

            Population = clone(nextPopulation)
            
            if (i % 1 == 0) {
                
                let fitnessBest = Math.round(nextPopulation[0].tspDistance);
                let fitnessMedian = Math.round(nextPopulation[Math.round(nextPopulation.length / 2)].tspDistance);
                let fitnessWorst = Math.round(nextPopulation[nextPopulation.length - 1].tspDistance);
                let fitnessPercentage = 0;
                if (this.optimalDistance != 0) {
                    fitnessPercentage = Math.round(fitnessBest / this.optimalDistance * 100, 2) - 100
                }

                const sum = nextPopulation.reduce((a, b) => a + b.tspDistance, 0);
                const avg = Math.round((sum / nextPopulation.length) || 0);

                console.log(`Gen: ${i}, NoImpr: ${counterNoImprovement}, PopSize: ${nextPopulation.length}(${x1}) => fitness: ${fitnessBest}(${fitnessPercentage}%) --${avg} -- ${fitnessMedian} -- ${fitnessWorst}`)
    
                // Write data to CSV file
                const cityName = this.tspFileName.replace('.tsp', '');
                const csvHeader = "City Name,Generation,Population Size,Fresh Population, FitnessPercentage,Average Fitness,Best Fitness, Median Fitness, Worst Fitness,Time Execution, Best Route\n";
                const csvData = `${cityName},${i},${nextPopulation.length},${x1},${fitnessPercentage}%,${avg},${fitnessBest},${fitnessMedian},${fitnessWorst},${JSON.stringify(nextPopulation[0].tspRoute)}\n`;
                if (!fs.existsSync(csvFilename)) {
                    // If the file doesn't exist, write the header
                    fs.writeFileSync(csvFilename, csvHeader);
                }
                
                fs.appendFileSync(csvFilename, csvData);

                pngFileName = pngFolder + '/'+this.tspFileName.replace('.tsp', '/') + this.tspFileName.replace('.tsp', `-${i}.png`)
                this.DrawTSPTour(pngFileName, Population[0])
             
            }
            
        }
        const endTime = new Date().getTime();
        const duration = (endTime - startTime) / 1000;
        console.log(`execution time: ${duration} seconds`)
    }
}

module.exports = {
    TSPGeneticAlgorithm: TSPGeneticAlgorithm,
    TSPTour: TSPTour
};

