# alyra-projet2

##Tests unitaires sur voting.sol

Le fichier de test Voting.js vérifie le bon fonctionnement du contrat Voting dans différentes situations :

-   Registration : Cette suite teste les fonctionnalités d'inscription des électeurs au système de vote. Elle vérifie notamment la bonne inscription de l'administrateur (owner) et des électeurs, ainsi que la gestion des tentatives d'inscription par des non-administrateurs et lorsque la phase d'inscription est terminée.

-   Proposals : Cette suite de tests se concentre sur l'ajout de propositions au système de vote. Elle vérifie que seuls les électeurs inscrits peuvent ajouter des propositions, que cela est impossible lorsque la phase de proposition est terminée, et qu'aucune proposition vide n'est acceptée.

-   Voting : Cette suite teste le processus de vote, y compris la possibilité pour les électeurs inscrits de voter, l'empêchement des votes multiples, l'impossibilité de voter après la fin de la session de vote, et la gestion des votes pour des propositions inexistantes.

-   Tally Votes : Cette suite vérifie le décompte des votes et la déclaration de la proposition gagnante une fois la session de vote terminée. Elle teste également que le décompte des votes est impossible avant la fin de la session de vote.

-   Workflow Transitions : Ces tests s'assurent que les transitions d'état du contrat se déroulent correctement, en commençant par l'enregistrement des propositions, en passant par la fin de la session de vote, et en finissant par le décompte des votes.
