const fs = require('fs');
const geneticAlgorithm = require('./main');
const express = require('express');
const app = express();
app.use(
    express.json({
        inflate: true,
        limit: "100kb",
        reviver: null,
        strict: true,
        type: "application/json",
        verify: undefined,
    })
);

const GA = new geneticAlgorithm.TSPGeneticAlgorithm();

const setting = {
    tspFilePath: './wi29.tsp', 

    configsGA: {
        populationSize: 0,
        generationSize: 0,
        tournamentRate: 0.05,
        elitismRate: 0.05,
        crossoverRate: 1.0,
        mutationRate: 0.1
    }
};

let jobQueue = [];
let resultsQueue = [];
let jobCounter = 0;
let cycleCount = 1; 
const jobVolume = 2; 
let nextPopulation = [];
let selectedPop = [];

const allCities = GA.ImportTSPFile(setting.tspFilePath)

setting.configsGA.populationSize = Math.round(allCities.length / 50) * 50 * 1.5 ;
setting.configsGA.generationSize = setting.configsGA.populationSize * 10;

const numberOfJobs =  setting.configsGA.populationSize * 2; 

GA.AutoTubeParameters(setting.configsGA)

let population = GA.GenerateInitialPopulationClosestCities()
const startTime = new Date().getTime();
nextPopulation = GA.Elitism(population)

selectedPop = tournament(population)
generateJobs(numberOfJobs, selectedPop);

function tournament(population){
    for (let i = 0; i < numberOfJobs ; i++){
        const selection = GA.TournamentSelection(population)
        selectedPop.push(selection)
    }
    return(selectedPop)
}

function generateJobs(numJobs, selectedPop){
    for (let i = 0; i < numJobs; i += jobVolume){
        const subPopulation = [];
        for (let j = i; j <  i + jobVolume; j++){
            subPopulation.push(selectedPop[j])
        }
        jobQueue.push({gen: cycleCount, id: ++jobCounter, solution: subPopulation});
    }
    selectedPop.length = 0;
}

app.get('/get-settings', (req, res) => {
    res.json(setting);

});

app.get('/get-job', (req, res) => {
    if (jobQueue.length > 0) {
        const job = jobQueue.shift(); 
        res.json(job);
    } else {
        res.status(404).send('No jobs available');
    }
});

app.post('/post-result', (req, res) => {
    const result = req.body;
    resultsQueue.push(result);

    for (let i = 0; i < result.solution.length; i++){
        if (result.gen == cycleCount){
            nextPopulation.push(result.solution[i])
        }
    }
   
    if(nextPopulation.length > (setting.configsGA.populationSize * 2 )){
        nextPopulation.sort((a, b) => (a.tspDistance - b.tspDistance))

        for (let j = 0; j < nextPopulation.length - 1; j++) {
            if (nextPopulation[j].tspDistance == nextPopulation[j + 1].tspDistance) {
                nextPopulation = nextPopulation.slice(0, j).concat(nextPopulation.slice(j + 1, nextPopulation.length))
                j--;
            }
        } 

        if (nextPopulation.length < setting.configsGA.populationSize ) {
            x1 = setting.configsGA.populationSize - nextPopulation.length
            GA.AddFreshPopulation(nextPopulation,x1 * 1.5)
            nextPopulation.sort((a, b) => (a.tspDistance - b.tspDistance))
            nextPopulation = nextPopulation.slice(0, setting.configsGA.populationSize)
        }

        if (nextPopulation.length >= setting.configsGA.populationSize ){ 
            nextPopulation = nextPopulation.slice(0, setting.configsGA.populationSize );
            jobCounter = 0;
            resultsQueue = []

            if (Math.round(nextPopulation[0].tspDistance) == Math.round(population[0].tspDistance)) {
                counterNoImprovement++;
            } else {
                counterNoImprovement = 0;
            }
              
            if (cycleCount % 10 == 0) {
                console.log(`Gen: ${cycleCount}, NoImpr: ${counterNoImprovement}, fitnes ${Math.round(nextPopulation[0].tspDistance)}`)
            }

            population = nextPopulation
            nextPopulation = []

            if (cycleCount < setting.configsGA.generationSize && counterNoImprovement < setting.configsGA.populationSize ) 
                {   
                    jobQueue = []

                    cycleCount++;
                    nextPopulation = GA.Elitism(population)
                    selectedPop = tournament(population)
                    generateJobs(numberOfJobs, selectedPop);

                }
            else    
            { 
            const endTime = new Date().getTime();
            const duration = (endTime - startTime) / 1000;
            console.log(`execution time: ${duration} seconds`)
            cleanupAndExit();
            }
        }
    }
res.status(200).send('Result received');
});

const server = app.listen(3000, () => {
    console.log('Master listening on port 3000');
});

function cleanupAndExit() {
    server.close(() => {
    console.log('Server closed after completing all cycles');
    process.exit(0); 
});
}


