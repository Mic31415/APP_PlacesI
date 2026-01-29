require 'xcodeproj'

project_path = 'ios/PlacesI.xcodeproj'
project = Xcodeproj::Project.open(project_path)
target = project.targets.first { |t| t.name == 'PlacesI' }

if target
    puts "Target found: #{target.name}"
    sources_phase = target.source_build_phase
    files = sources_phase.files.map { |f| f.file_ref.display_name }
    
    if files.include?('Secrets.swift')
        puts "SUCCESS: Secrets.swift is in Compile Sources."
    else
        puts "FAILURE: Secrets.swift is NOT in Compile Sources."
        puts "Current sources: #{files.grep(/swift/)}"
    end
else
    puts "Target 'PlacesI' not found."
end
