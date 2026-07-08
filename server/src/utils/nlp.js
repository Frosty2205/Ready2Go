export const findObjectsInText = (text, objects) => {
    return objects.filter(item => 
        item.tags.some(tag => text.toLowerCase().includes(tag))
    );
};