// Spring annotation routes (TSPEC-A021 parity).
package com.example;

@RestController
@RequestMapping("/teams")
public class TeamController {

  @PostMapping
  public Object create() {
    return null;
  }

  @GetMapping("/members")
  public Object members() {
    return null;
  }
}
