Feature: GPD Lab Website
  The static site should correctly display information about the GPD Lab.

  Scenario: View Home Page
    Given I access the GPD Lab home page
    Then I should see a navbar with links to About, Projects, Publications, Members, Contact
    And I should see a hero section with headline "Welcome to GPT Lab"
    And the hero section should contain two buttons "Get in Touch" and "Learn More"

  Scenario: Explore About Section
    Given I am on the GPD Lab home page
    When I scroll to the About section
    Then I should see the title "About GPT Lab"
    And a description about the lab's mission

  Scenario: Browse Projects
    Given I am on the GPD Lab home page
    When I navigate to the Projects section
    Then I should see a title "Our Projects"
    And a grid of project cards with titles and brief descriptions

  Scenario: Check Publications
    Given I am on the GPD Lab home page
    When I go to the Publications section
    Then I should see a title "Publications"
    And a grid of publications with titles and abstracts

  Scenario: View Team Members
    Given I am on the GPD Lab home page
    When I view the Members section
    Then I should see the title "Our Team"
    And a grid of team members with names and roles

  Scenario: Contact Information
    Given I am on the GPD Lab home page
    When I go to the Contact section
    Then I should see the title "Contact Us"
    And placeholder contacts like "abc@gmail.com" and "rxyz.com"
