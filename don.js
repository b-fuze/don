#! /usr/bin/env node

const { parse } = require("./parse.js")
const { readFileSync } = require("fs")
const path = require("path")

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
  let foundCircular = null

  for (const command of commands) {
    commandNum++

    if (command.type === "dependency") {
      for (const depName of command.dependencies) {
        let depDepth = stack.size
        const dependencyStack = new Set(stack)

        dependencyStack.add(depName)

        if (dependencyStack.size === depDepth + 1) {
          // No circular reference for this dep, check further dependencies
          foundCircular = checkCircular(donTree, target, donTree[depName], dependencyStack)
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

      if (foundCircular) {
        return foundCircular
      }
    }
  }

  return null
}

function donParse(source, absFile, error, exit = () => {}) {
  try {
    const { targets: parsed } = parse(source)

    // Check for undefined dependencies
    let undefinedDependencies = checkDependencyReferences(parsed)

    if (undefinedDependencies.length) {
      error(absFile + "\nError:\n")

      for (const undep of undefinedDependencies) {
        error(`  Target "${ undep.target }" references undefined dependency "${ undep.dependency }"`)
      }

      exit(1)
    }

    let circularDeps = []

    for (const [target, commands] of Object.entries(parsed)) {
      const targetCircularDeps = checkCircular(parsed, target, commands, new Set([target]))

      if (targetCircularDeps) {
        circularDeps.push(targetCircularDeps)
      }
    }

    if (circularDeps.length) {
      error(absFile + "\nError:")

      for (const cirdep of circularDeps) {
        error(`  Target "${ cirdep.target }" has circular dependency "${ cirdep.dependency }" via its dependency "${ cirdep.via }" on command ${ cirdep.commandNumber }`)
      }

      exit()
    }

    return parsed
  } catch(e) {
    if (!e.location) {
      error(e.toString())
      return exit()
    }

    const loc = e.location.start
    error(`${ absFile }:${ loc.line }:${ loc.column }\n${ e.name }: ${ e.message }`)
    exit()
  }
}

module.exports = {
  parse(source, filePath = "internal") {
    let error = ""
    const result = donParse(source, filePath, err => {
      error += err
    })

    if (error) {
      throw new Error(error)
    }

    return result
  }
}

if (require.main === module) {
  const file = process.argv[2]
  const absFile = path.resolve(__dirname, file)
  const source = readFileSync(file, "utf8")

  let error = ""
  const result = donParse(source, absFile, err => {
    error += err + "\n"
  }, () => {
    process.stderr.write(error)
    process.exit(1)
  })

  console.log(JSON.stringify(result, null, 4))
}

