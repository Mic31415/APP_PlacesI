require 'xcodeproj'

project_path = 'ios/PlacesI.xcodeproj'
file_path = 'PlacesI/Secrets.swift'
group_name = 'PlacesI'

project = Xcodeproj::Project.open(project_path)
target = project.targets.first

group = project.main_group.find_sub_group(group_name)
if group
    unless group.find_file_by_path('Secrets.swift')
        file_ref = group.new_file('Secrets.swift')
        target.add_file_references([file_ref])
        puts "Added Secrets.swift to project"
        project.save
    else
        puts "Secrets.swift already exists in project"
    end
else
    puts "Could not find group #{group_name}"
end
