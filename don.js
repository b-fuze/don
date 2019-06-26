#! /usr/bin/env node

const { parse } = require("./parse.js")
const { readFileSync } = require("fs")
const path = require("path")

const file = process.argv[2]
const src = readFileSync(file, "utf8")

function checkDependencyReferences(donTree) {
  const undefinedDependencies = [
    // {
    //   target: "target",
    //   dependency: "dep",
    // }
  ]

  for (const [target, commands] of Object.entries(donTree)) {
    for (const command of commands) {
      if (command.type === "dependency") {
        for (const dep of command.dependencies) {
          if (!donTree.hasOwnProperty(dep)) {
            undefinedDependencies.push({
              target, 
              dependency: dep,
            })
          }
        }
      }
    }
  }

  return undefinedDependencies
}

function checkCircular(donTree, target, commands, stack = new Set()) {
  let commandNum = 0

  for (const command of commands) {
    commandNum++

    if (command.type === "dependency") {
      for (const depName of command.dependencies) {
        let depDepth = stack.size
        const dependencyStack = new Set(stack)

        dependencyStack.add(depName)

        if (dependencyStack.size === depDepth + 1) {
          // No circular reference for this dep, check further dependencies
          return checkCircular(donTree, target, donTree[depName], dependencyStack)
        } else {
          // Found circular reference
          return {
            target,
            via: Array.from(dependencyStack).slice(-1)[0],
            dependency: depName,
            commandNumber: commandNum,
          }
        }
      }
    }
  }

  return null
}

const absFile = path.resolve(__dirname, file)

try {
  const parsed = parse(src)

  // Check for undefined dependencies
  let undefinedDependencies = checkDependencyReferences(parsed)

  if (undefinedDependencies.length) {
    console.error(absFile + "\nError:\n")

    for (const undep of undefinedDependencies) {
      console.error(`  Target "${ undep.target }" references undefined dependency "${ undep.dependency }"`)
    }

    process.exit(1)
  }

  let circularDeps = []

  for (const [target, commands] of Object.entries(parsed)) {
    const targetCircularDeps = checkCircular(parsed, target, commands, new Set([target]))

    if (targetCircularDeps) {
      circularDeps.push(targetCircularDeps)
    }
  }

  if (circularDeps.length) {
    console.error(absFile + "\nError:")

    for (const cirdep of circularDeps) {
      console.error(`  Target "${ cirdep.target }" has circular dependency "${ cirdep.dependency }" via its dependency "${ cirdep.via }" on command ${ cirdep.commandNumber }`)
    }

    process.exit(1)
  }

  console.log(JSON.stringify(parsed, null, 4))
} catch(e) {
  const loc = e.location.start
  console.error(`${ absFile }:${ loc.line }:${ loc.column }\n${ e.name }: ${ e.message }`)
}

