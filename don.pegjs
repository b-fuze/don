start
 = ( comments_whitespace ws + ) ? targets_arr:target_list {
     const targets = {}
     
     for (const target of targets_arr) {
       targets[target.name] = target.commands
     }

     return targets
   }


target_list
 = tgt:target ( comments_whitespace ) ? ws + rec_tgts:target_list { return [tgt].concat(rec_tgts) }
 / tgt:target ( comments_whitespace ) ? ws * { return [tgt] }

comments_whitespace
 = ws * comment comments_whitespace
 / ws * comment

comment
 = "#" [^\r\n] +

target
 = tn:target_name ":" is nl
   commands:( ( command / command_dependency ) + ) { return { name: tn, commands } }

command
 = main_ci:command_indent "- " ! ( "$" target_name ) cs:command_string nl
   multil_str:(
     // Comments in multi-line
     multil_ci:command_indent "#" multil_cs:command_string nl {
       if (multil_ci === main_ci + "  ") {
         const multiline_begin = multil_cs.slice(0, 2)

         return "COMMENT"
       } else {
         return expected("multi-line indent matching first line of command")
       }
     }
     // Normal commands in multi-line
     / multil_ci:command_indent ! "- " multil_cs:command_string nl {
         if (multil_ci === main_ci + "  ") {
           const multiline_begin = multil_cs.slice(0, 2)

           if (multiline_begin !== "- " && multiline_begin !== "-") {
             return { command_line: " " + multil_cs }
           } else {
             return expected("Multi line commands can't start with a single hyphen, consider quoting the single hyphen")
           }
         } else {
           return expected("multi-line indent matching first line of command")
         }
       } 
   ) * {
     return {
       type: "command",
       command: cs + multil_str.map(line => line === "COMMENT" ? "" : line.command_line).join(""),
     }
   }

command_dependency
 = main_ci:command_indent "- " cs:dependency_string nl {
     return {
       type: "dependency",
       dependencies: cs,
     }
   }

command_indent
 = "  " " " * { return text() }

target_name
 = [a-z0-9_-]i + { return text() }

command_string
 = [^\r\n] + { return text() }

dependency_string
 = "$" name:target_name is right:dependency_string { return [name].concat(right) }
 / "$" name:target_name is { return [name] }

// Inline space
is
 = " " * { return text() }

// White space
ws
 = [ \r\n] + { return text() }

// Newline
nl
 = "\n"
 / "\r\n"

