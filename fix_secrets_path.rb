require 'xcodeproj'

project_path = 'ios/PlacesI.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Find all references to Secrets.swift
refs = project.files.select { |f| f.path == 'Secrets.swift' || f.name == 'Secrets.swift' }

if refs.empty?
    puts "No references to Secrets.swift found."
else
    refs.each do |ref|
        puts "Found reference: name=#{ref.name}, path=#{ref.path}, real_path=#{ref.real_path}"
        
        # We know the file is at ios/PlacesI/Secrets.swift
        # If the project is at ios/PlacesI.xcodeproj, the root is ios/
        
        # Check if this reference is broken (pointing to root)
        if ref.path == 'Secrets.swift'
            # Assuming the parent group might not provide the 'PlacesI' path context
            # We explicitly set the path to 'PlacesI/Secrets.swift' relative to the project root (usually)
            
            puts "Updating path to 'PlacesI/Secrets.swift'"
            ref.set_path('PlacesI/Secrets.swift')
        end
    end
    project.save
    puts "Project saved."
end
